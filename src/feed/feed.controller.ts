import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { CreateFeedDto, CreateFeedPostDto, GetSavedPostsDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.strategy';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from 'src/auth/entities/user.entity';
import { Report } from './entities/report.entity';
import { UserRole } from '../auth/enums/userRole.enum';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('feed')
export class FeedController {
  @Post('post')
  @ApiBearerAuth('jwt-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new post (LinkedIn-style feed)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Post created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid post data' })
  async createFeedPost(@Body() dto: import('./dto/create-post.dto').CreatePostDto, @Req() req: any) {
    const user = req.user;
    if (!user) throw new Error('Authentication required');
    return await this.feedService.createFeedPost(user, dto);
  }

  constructor(private readonly feedService: FeedService) {}

  @Post(':postId/save-toggle')
  toggleSave(@Param('postId') postId: number, @Request() req) {
    // Simulate user.id = 1 if auth not ready
    return this.feedService.toggleSavePost(+postId, req.user?.id ?? 1);
  }

  @ApiBearerAuth('jwt-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get paginated saved posts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated saved posts',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @Get('saved')
  async getSavedPosts(@Req() req: Request, @Query() query: GetSavedPostsDto) {
    const userId = req['user'].id;
    return this.feedService.getSavedPosts(userId, query.page, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/comments')
  async addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.feedService.addComment(postId, req.user, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feed post' })
  @ApiResponse({ status: 201, description: 'The post has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  create(@Body() createFeedPostDto: CreateFeedPostDto) {
    return this.feedService.create(createFeedPostDto);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10, max: 100)' })
  @ApiResponse({ status: 200, description: 'Returns paginated feed posts' })
  async getFeed(@Query() paginationParams: PaginationParamsDto) {
    return this.feedService.getPaginatedPosts(paginationParams);
  }

  @Get('all')
  @ApiResponse({ status: 200, description: 'Returns all feed posts (use with caution)' })
  async findAll() {
    return this.feedService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feedService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFeedDto: UpdateFeedDto) {
    return this.feedService.update(+id, updateFeedDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedService.remove(+id);
  }

  @Get('reports')
  @ApiBearerAuth('jwt-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get paginated reported content for admin review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns paginated reported content' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getReportedContent(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.feedService.getReportedContent(Number(page), Number(limit));
  }
}