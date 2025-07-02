import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from './enums/userRole.enum';
import type { Repository } from 'typeorm';
import type { User } from './entities/user.entity';
import type { Portfolio } from './entities/portfolio.entity';
import type { EmailToken } from './entities/email-token.entity';
import { User } from './entities/user.entity';
import { Portfolio } from './entities/portfolio.entity';
import { EmailToken } from './entities/email-token.entity';
import * as bcrypt from 'bcryptjs';
import type { RegisterDto } from './dto/register-user.dto';
import type { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { JwtService } from '@nestjs/jwt';
import { addHours } from 'date-fns';
import * as crypto from 'crypto';
import type { PasswordReset } from './entities/password-reset.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import type { LogInDto } from './dto/loginDto';
import { LogInProvider } from './providers/loginProvider';
import { TeamService } from './services/team.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SkillVerification,
  VerificationStatus,
} from './entities/skills-verification.entity';
import {
  CreateSkillVerificationDto,
  SkillAssessmentDto,
  UpdateSkillVerificationDto,
} from './dto/skills.dto';


@Injectable()
export class AuthService {
  /**
   * Promote a user to admin. Only super admins can perform this action.
   * @param requesterId - ID of the user making the request
   * @param targetUserId - ID of the user to be promoted
   */
  async promoteToAdmin(
    requesterId: string,
    targetUserId: string,
  ): Promise<User> {
    // Get the requesting user
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
    });
    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException(
        'Only super admins can promote users to admin',
      );
    }
    // Get the target user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new BadRequestException('Target user does not exist');
    }
    // Update the role
    targetUser.role = UserRole.ADMIN;
    await this.userRepository.save(targetUser);
    return targetUser;
  }

  // TODO: Move allowedMimeTypes and maxFileSize to configuration
  private allowedMimeTypes: string[];
  private maxFileSize: number;
  private readonly EMAIL_TOKEN_EXPIRATION_HOURS = 24;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(EmailToken)
    private readonly emailTokenRepository: Repository<EmailToken>,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
    private readonly loginProvider: LogInProvider,
    private readonly teamService: TeamService,
    private readonly mailService: MailService,
    @InjectRepository(SkillVerification)
    private skillVerificationRepository: Repository<SkillVerification>,
  ) {
    this.allowedMimeTypes = this.configService.get<string[]>(
      'portfolio.allowedMimeTypes',
      ['image/jpeg', 'image/png', 'application/pdf'],
    );
    this.maxFileSize = this.configService.get<number>(
      'portfolio.maxFileSize',
      5 * 1024 * 1024,
    );
  }

  async checkUserTeamPermission(
    userId: string,
    teamId: string,
    permission: string,
  ): Promise<boolean> {
    return this.teamService.checkTeamPermission(
      teamId,
      userId,
      permission as any,
    );
  }

  async getUserTeamRole(
    userId: string,
    teamId: string,
  ): Promise<string | null> {
    return this.teamService.getUserTeamRole(teamId, userId);
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { email, password, role } = registerDto;

    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) throw new BadRequestException('Email already exists');

    const hashed = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashed,
      role,
      isEmailVerified: false,
    });

    const saved = await this.userRepository.save(user);
    await this.sendVerificationEmail(user.email);

    const { password: _, ...safeUser } = saved;
    return safeUser;
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invalidate any existing tokens
    await this.emailTokenRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), this.EMAIL_TOKEN_EXPIRATION_HOURS);

    // Save token
    const emailToken = this.emailTokenRepository.create({
      token,
      expiresAt,
      user,
      used: false,
    });

    await this.emailTokenRepository.save(emailToken);

    // Send verification email
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    await this.mailService.sendVerificationEmail(user.email, verificationUrl);
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const emailToken = await this.emailTokenRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const now = new Date();
    if (emailToken.expiresAt < now) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark token as used
    emailToken.used = true;
    await this.emailTokenRepository.save(emailToken);

    // Update user's email verification status
    await this.userRepository.update(emailToken.userId, {
      isEmailVerified: true,
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.sendVerificationEmail(email);
  }

  async getOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async login(loginDto: LogInDto): Promise<string> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOneBy({ email: email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support for assistance.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return; // don't reveal user existence

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    const reset = this.passwordResetRepository.create({
      user: user,
      token,
      expiresAt,
    });

    await this.passwordResetRepository.save(reset);

    const resetLink = `https://your-app.com/reset-password?token=${token}`;

    await this.mailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `Click the link to reset your password: <a href="${resetLink}">Reset Password</a>`, // or 'text' depending on your interface
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = await this.passwordResetRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!reset || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    reset.user.password = hashedPassword;
    await this.userRepository.save(reset.user);
    await this.passwordResetRepository.delete({ id: reset.id });
  }

  // --- Portfolio Methods ---
  async createPortfolio(
    userId: string,
    dto: CreatePortfolioDto,
    file: any,
  ): Promise<Portfolio> {
    if (!file) throw new BadRequestException('File is required');
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF are allowed.',
      );
    }
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const fileUrl = `/uploads/portfolio/${encodeURIComponent(file.filename)}`;
    const portfolio = this.portfolioRepository.create({
      title: dto.title,
      description: dto.description,
      fileUrl,
      user,
    });
    return this.portfolioRepository.save(portfolio);
  }

  async updatePortfolio(
    userId: string,
    portfolioId: string,
    dto: Partial<CreatePortfolioDto>,
    file?: any,
  ): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
      relations: ['user'],
    });
    if (!portfolio || portfolio.user.id !== userId) {
      throw new UnauthorizedException('Portfolio not found or access denied');
    }
    if (dto.title) portfolio.title = dto.title;
    if (dto.description) portfolio.description = dto.description;
    if (file) {
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and PDF are allowed.',
        );
      }
      if (file.size > this.maxFileSize) {
        throw new BadRequestException('File size exceeds the 5MB limit.');
      }
      portfolio.fileUrl = `/uploads/portfolio/${file.filename}`;
    }
    return this.portfolioRepository.save(portfolio);
  }

  async deletePortfolio(userId: string, portfolioId: string): Promise<void> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
      relations: ['user'],
    });
    if (!portfolio || portfolio.user.id !== userId) {
      throw new UnauthorizedException('Portfolio not found or access denied');
    }
    await this.portfolioRepository.remove(portfolio);
  }

  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    return this.portfolioRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async getUsersWithFilters(
    page: number,
    limit: number,
    role?: UserRole,
    isSuspended?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.role',
        'user.isSuspended',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isSuspended !== undefined) {
      queryBuilder.andWhere('user.isSuspended = :isSuspended', { isSuspended });
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async suspendUser(adminId: string, targetUserId: string): Promise<User> {
    // Get the admin user
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new UnauthorizedException('Only administrators can suspend users');
    }

    // Get the target user
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new BadRequestException('Target user does not exist');
    }

    // Prevent suspending admins and super admins
    if (
      targetUser.role === UserRole.ADMIN ||
      targetUser.role === UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException('Cannot suspend administrators');
    }

    // Prevent self-suspension
    if (adminId === targetUserId) {
      throw new BadRequestException('Cannot suspend your own account');
    }

    // Toggle suspension status
    targetUser.isSuspended = !targetUser.isSuspended;
    await this.userRepository.save(targetUser);

    return targetUser;
  }

  async getPublicRecruiterProfile(recruiterId: string): Promise<Partial<User>> {
    const recruiter = await this.userRepository.findOne({
      where: {
        id: recruiterId,
        role: UserRole.RECRUITER,
      },
      select: ['id', 'email', 'role', 'createdAt'],
    });

    if (!recruiter) {
      throw new NotFoundException('Recruiter not found');
    }

    // Return only public information
    return {
      id: recruiter.id,
      role: recruiter.role,
      createdAt: recruiter.createdAt,
    };
  }

  async createSkillVerification(
    userId: string,
    dto: CreateSkillVerificationDto,
  ): Promise<SkillVerification> {
    const skillVerification = new SkillVerification();
    skillVerification.user = { id: userId } as any;
    skillVerification.skillName = dto.skillName;
    skillVerification.category = dto.category;
    skillVerification.certificateUrl = dto.certificateUrl;
    skillVerification.issuingOrganization = dto.issuingOrganization;
    skillVerification.expiryDate = dto.expiryDate
      ? new Date(dto.expiryDate)
      : null;
    skillVerification.verificationNotes = dto.verificationNotes;

    // Generate certificate hash if URL provided
    if (dto.certificateUrl) {
      skillVerification.certificateHash = crypto
        .createHash('sha256')
        .update(dto.certificateUrl + userId + Date.now())
        .digest('hex');
    }

    return await this.skillVerificationRepository.save(skillVerification);
  }

  async getUserSkillVerifications(
    userId: string,
  ): Promise<SkillVerification[]> {
    return await this.skillVerificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getSkillVerificationById(
    id: string,
    userId: string,
  ): Promise<SkillVerification> {
    const verification = await this.skillVerificationRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!verification) {
      throw new NotFoundException('Skill verification not found');
    }

    return verification;
  }

  async updateSkillVerification(
    id: string,
    userId: string,
    dto: UpdateSkillVerificationDto,
  ): Promise<SkillVerification> {
    const verification = await this.getSkillVerificationById(id, userId);

    if (verification.status === VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Cannot update verified skill');
    }

    Object.assign(verification, dto);

    if (dto.expiryDate) {
      verification.expiryDate = new Date(dto.expiryDate);
    }

    // Update certificate hash if URL changed
    if (dto.certificateUrl) {
      verification.certificateHash = crypto
        .createHash('sha256')
        .update(dto.certificateUrl + userId + Date.now())
        .digest('hex');
    }

    return await this.skillVerificationRepository.save(verification);
  }

  async submitSkillAssessment(
    dto: SkillAssessmentDto,
  ): Promise<SkillVerification> {
    const verification = await this.skillVerificationRepository.findOne({
      where: { id: dto.skillVerificationId },
    });

    if (!verification) {
      throw new NotFoundException('Skill verification not found');
    }

    verification.assessmentScore = dto.score;
    verification.assessmentId = dto.assessmentId;

    // Auto-verify if score is above threshold
    if (dto.score >= 80) {
      verification.status = VerificationStatus.VERIFIED;
      verification.credibilityScore =
        this.calculateCredibilityScore(verification);
    } else if (dto.score < 60) {
      verification.status = VerificationStatus.REJECTED;
    }

    return await this.skillVerificationRepository.save(verification);
  }

  async verifySkillOnBlockchain(
    id: string,
    txHash: string,
  ): Promise<SkillVerification> {
    const verification = await this.skillVerificationRepository.findOne({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('Skill verification not found');
    }

    verification.blockchainTxHash = txHash;
    verification.status = VerificationStatus.VERIFIED;
    verification.credibilityScore =
      this.calculateCredibilityScore(verification);

    return await this.skillVerificationRepository.save(verification);
  }

  async getVerifiedSkillsByUser(userId: string): Promise<SkillVerification[]> {
    return await this.skillVerificationRepository.find({
      where: {
        user: { id: userId },
        status: VerificationStatus.VERIFIED,
      },
      order: { credibilityScore: 'DESC' },
    });
  }

  private calculateCredibilityScore(verification: SkillVerification): number {
    let score = 0;

    // Base score from assessment
    if (verification.assessmentScore) {
      score += verification.assessmentScore * 0.4;
    }

    // Certificate bonus
    if (verification.certificateUrl) {
      score += 20;
    }

    // Blockchain verification bonus
    if (verification.blockchainTxHash) {
      score += 30;
    }

    // Issuing organization bonus
    if (verification.issuingOrganization) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  async checkExpiredVerifications(): Promise<void> {
    const expiredVerifications = await this.skillVerificationRepository.find({
      where: {
        status: VerificationStatus.VERIFIED,
        expiryDate: new Date(),
      },
    });

    for (const verification of expiredVerifications) {
      verification.status = VerificationStatus.EXPIRED;
      await this.skillVerificationRepository.save(verification);
    }
  }
}
