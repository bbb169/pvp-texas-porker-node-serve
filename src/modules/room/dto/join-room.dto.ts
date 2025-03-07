import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * JoinRoomDto - Data Transfer Object for joining an existing room
 * 
 * This DTO defines and validates the parameters required for a player to join a room
 */
export class JoinRoomDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
  @MinLength(1, { message: 'Room ID must not be empty' })
      roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
  @MinLength(1, { message: 'User name must not be empty' })
      userName: string;
}