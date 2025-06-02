import {
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LogInDto } from '../dto/loginDto';
import { HashingProvider } from './hashingProvider';
import { GenerateTokensProvider } from './generateTokensProvider';

/**
 * Signin provider class
 */
@ApiTags('Authentication')
@Injectable()
export class LogInProvider {
  constructor(
    /**
     * Injecting UserService repository
     */
    @Inject(forwardRef(() => userService))
    private readonly userService: UserService,

    /**
     * Injecting hashing dependency
     */
    private readonly hashingProvider: HashingProvider,

    /**
     * Injecting GenerateTokensProvider
     */
    private readonly generateTokenProvider: GenerateTokensProvider,
  ) {}

  /**
   * Sign in method
   * @param signInDto - User credentials
   * @returns Access and refresh tokens
   */
  @ApiOperation({ summary: 'User sign-in' })
  @ApiResponse({ status: 200, description: 'Successfully signed in' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 408, description: 'Database connection timeout' })
  public async Login(loginDto: LogInDto) {
    // Check if user exists in database
    const user = await this.userService.GetOneByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('email or password is incorrect');
    }

    // Compare password
    let isCheckedPassword: boolean = false;

    try {
      isCheckedPassword = await this.hashingProvider.comparePasswords(
        loginDto.password,
        user.password,
      );
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'error connecting to the database',
      });
    }

    if (!isCheckedPassword) {
      throw new UnauthorizedException('email or password is incorrect');
    }
    
    // Generate tokens
    return await this.generateTokenProvider.generateTokens(user);
  }
}