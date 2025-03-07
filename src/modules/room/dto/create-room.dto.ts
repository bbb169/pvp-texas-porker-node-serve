import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * CreateRoomDto - Data Transfer Object for creating a new room
 * 
 * This DTO defines and validates the parameters required for room creation
 */
export class CreateRoomDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
  @MinLength(1, { message: 'Room ID must not be empty' })
      roomId: string;

  @IsNotEmpty({ message: 'Creator name cannot be empty' })
  @IsString({ message: 'Creator name must be a string' })
  @MinLength(1, { message: 'Creator name must not be empty' })
      creatorName: string;
}