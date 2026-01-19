export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}