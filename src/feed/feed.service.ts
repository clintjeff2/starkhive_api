import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPost } from './entities/savedpost.entity';
import { CreateFeedDto } from './dto/create-feed.dto';
import { UpdateFeedDto } from './dto/update-feed.dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(SavedPost)
    private savedPostRepo: Repository<SavedPost>,
  ) {}

  async toggleSavePost(postId: number, userId: number): Promise<{ message: string }> {
    const existing = await this.savedPostRepo.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.savedPostRepo.remove(existing);
      return { message: 'Post unsaved' };
    }

    const savedPost = this.savedPostRepo.create({ postId, userId });
    await this.savedPostRepo.save(savedPost);
    return { message: 'Post saved' };
  }

  async getSavedPosts(userId: number, page = 1, limit = 10) {
    const [savedPosts, total] = await this.savedPostRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['post'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      total,
      page,
      limit,
      data: savedPosts.map((sp) => sp.post),
    };
  }

  create(createFeedDto: CreateFeedDto) {
    return 'This action adds a new feed';
  }

  findAll() {
    return `This action returns all feed`;
  }

  findOne(id: number) {
    return `This action returns a #${id} feed`;
  }

  update(id: number, updateFeedDto: UpdateFeedDto) {
    return `This action updates a #${id} feed`;
  }

  remove(id: number) {
    return `This action removes a #${id} feed`;
  }
}