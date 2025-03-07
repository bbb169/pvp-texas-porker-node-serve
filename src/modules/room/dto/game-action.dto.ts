import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GameActionDto - Base Data Transfer Object for game actions
 * 
 * This DTO serves as a base for various game action DTOs and includes
 * common properties like player information
 */
export class GameActionDto {
  @IsNotEmpty({ message: 'Player information is required' })
      player: {
    name: string;
    [key: string]: any;
  };
  
  @IsOptional()
  @IsNumber({}, { message: 'Chips must be a number' })
  @Min(0, { message: 'Chips must be at least 0' })
      chips?: number;
}

/**
 * StartGameDto - Data Transfer Object for starting a new game
 * 
 * This DTO defines and validates the parameters required for starting a game
 */
export class StartGameDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;

  @IsOptional()
  @IsBoolean({ message: 'isShortCard must be a boolean' })
      isShortCard?: boolean;
}

/**
 * CallChipsDto - Data Transfer Object for a player calling chips
 * 
 * This DTO defines and validates the parameters required for a player to call chips
 */
export class CallChipsDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
      userName: string;

  @IsOptional()
  @IsNumber({}, { message: 'Chips must be a number' })
  @Min(0, { message: 'Chips must be at least 0' })
      chips?: number;
}

/**
 * TurnToNextGameDto - Data Transfer Object for turning to the next game
 * 
 * This DTO defines and validates the parameters required for turning to the next game
 */
export class TurnToNextGameDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;
}

/**
 * FoldCardsDto - Data Transfer Object for folding cards
 * 
 * This DTO defines and validates the parameters required for a player to fold cards
 */
export class FoldCardsDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
      userName: string;
}

/**
 * CheckCardsDto - Data Transfer Object for checking cards
 * 
 * This DTO defines and validates the parameters required for a player to check
 */
export class CheckCardsDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
      userName: string;
}

/**
 * GetPredictionDto - Data Transfer Object for getting AI prediction
 * 
 * This DTO defines and validates the parameters required for getting a GPT prediction
 */
export class GetPredictionDto {
  @IsNotEmpty({ message: 'Room ID cannot be empty' })
  @IsString({ message: 'Room ID must be a string' })
      roomId: string;

  @IsNotEmpty({ message: 'User name cannot be empty' })
  @IsString({ message: 'User name must be a string' })
      userName: string;
}