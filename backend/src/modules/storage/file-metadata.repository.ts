import { EntityRepository, Repository } from 'typeorm';
import { FileMetadata } from './file-metadata.entity';

@EntityRepository(FileMetadata)
export class FileMetadataRepository extends Repository<FileMetadata> {}
