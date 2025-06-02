import { ApiProperty } from "@nestjs/swagger"

export class MessageResponseDto {
  @ApiProperty({
    description: "Unique identifier for the message",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string

  @ApiProperty({
    description: "The content of the message",
    example: "Hello, I would like to discuss your project proposal.",
  })
  content: string

  @ApiProperty({
    description: "The ID of the sender",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  senderId: string

  @ApiProperty({
    description: "The ID of the recipient",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  recipientId: string

  @ApiProperty({
    description: "Whether the message has been read",
    example: false,
  })
  isRead: boolean

  @ApiProperty({
    description: "When the message was sent",
    example: "2023-06-01T12:00:00Z",
  })
  createdAt: Date
}
