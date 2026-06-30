import { IsString, IsArray, IsIn, ValidateNested, IsNotEmpty, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class SendChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history: ChatTurnDto[];
}
