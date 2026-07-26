import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { Property } from '../properties/entities/property.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Favorite, Property])],
    providers: [FavoritesService],
    controllers: [FavoritesController],
    exports: [FavoritesService],
})
export class FavoritesModule { }
