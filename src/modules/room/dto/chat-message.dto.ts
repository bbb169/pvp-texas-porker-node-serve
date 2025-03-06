import { IsNotEmpty, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * PlayerInfoDto - Data Transfer Object representing a player's information
 * 
 * This DTO is used as a nested object within ChatMessageDto
 */
export class PlayerInfoDto {
  @IsNotEmpty({ message: 'Player name cannot be empty' })
  @IsString({ message: 'Player name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Position is required' })
  @IsNumber({}, { message: 'Position must be a number' })
  position: number;

  // Other player properties are not validated in this DTO as they may not be required
  // for chat message functionality, but they're included for type completion
  status?: string[];
  holdCards?: any[];
  debt?: number;
  calledChips?: number;
  holdCent?: number;
  blind?: number;
  roundCalled?: boolean;
  activeTime?: number;
}

/**
 * ChatMessageDto - Data Transfer Object for chat messages
 * 
 * This DTO defines the structure for messages exchanged in room chat,
 * including text messages, emoticons, and audio messages.
 * It's based on the original ChatMessageType structure from roomInfo.ts
 */
export class ChatMessageDto {
  @IsNotEmpty({ message: 'Key cannot be empty' })
  key: string | number;

  @IsNotEmpty({ message: 'Player information is required' })
  @ValidateNested()
  @Type(() => PlayerInfoDto)
  player: PlayerInfoDto;

  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @IsString({ message: 'Message content must be a string' })
  msg: string;
}

/**
 * TextMessageDto - Specialized DTO for text messages
 */
export class TextMessageDto extends ChatMessageDto {
  @IsString({ message: 'Text message must be a string' })
  msg: string;
}

/**
 * EmoticonMessageDto - Specialized DTO for emoticon messages
 */
export class EmoticonMessageDto extends ChatMessageDto {
  @IsString({ message: 'Emoticon code must be a string' })
  msg: string;
}

/**
 * AudioMessageDto - Specialized DTO for audio messages
 */
export class AudioMessageDto extends ChatMessageDto {
  @IsString({ message: 'Audio URL must be a string' })
  msg: string;
  
  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  duration?: number;
}

/**
 * SendChatMessageDto - DTO for sending a chat message to a room
 */
export class SendChatMessageDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
  roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
  userName: string;

  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @IsString({ message: 'Message content must be a string' })
  message: string;

  @IsOptional()
  @IsString({ message: 'Message type must be a string' })
  type?: 'text' | 'emoticon' | 'audio';
}