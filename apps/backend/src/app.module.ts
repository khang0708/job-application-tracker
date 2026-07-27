import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { CompaniesModule } from './companies/companies.module';
import { ApplicationsModule } from './applications/applications.module';
import { AiModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { N8nModule } from './integrations/n8n/n8n.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const config: any = {
          type: 'postgres',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
        };

        if (databaseUrl) {
          config.url = databaseUrl;
          config.ssl = true;
        } else {
          config.host = configService.get<string>('DB_HOST', 'localhost');
          config.port = configService.get<number>('DB_PORT', 5432);
          config.username = configService.get<string>('DB_USERNAME', 'postgres');
          config.password = configService.get<string>('DB_PASSWORD', 'postgres');
          config.database = configService.get<string>('DB_NAME', 'fullstack_db');
        }

        return config;
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ResumesModule,
    CompaniesModule,
    ApplicationsModule,
    AiModule,
    ChatModule,
    N8nModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
