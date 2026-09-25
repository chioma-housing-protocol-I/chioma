import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document, DocumentStatus } from './document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  UploadDocumentContentDto,
} from './dto/document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateDocumentDto, userId: string): Promise<Document> {
    return this.dataSource.transaction(async (manager) => {
      const document = await manager.save(
        manager.create(Document, {
          ownerId: userId,
          name: dto.name,
          description: dto.description ?? null,
          storageKey: dto.storageKey,
          checksum: dto.checksum,
          mimeType: dto.mimeType ?? null,
          currentVersion: 1,
        }),
      );
      await manager.save(
        manager.create(DocumentVersion, {
          documentId: document.id,
          version: 1,
          storageKey: dto.storageKey,
          checksum: dto.checksum,
          mimeType: dto.mimeType ?? null,
          uploadedBy: userId,
          changeNote: dto.changeNote ?? null,
        }),
      );
      return document;
    });
  }

  async findOne(id: string, userId: string): Promise<Document> {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException(`Document ${id} not found`);
    if (document.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this document');
    }
    return document;
  }

  /** Metadata-only edit; never touches content or versions. */
  async update(
    id: string,
    dto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(id, userId);
    if (dto.status === DocumentStatus.SIGNED) {
      throw new BadRequestException('Use the sign endpoint to sign documents');
    }
    if (dto.name !== undefined) document.name = dto.name;
    if (dto.description !== undefined) document.description = dto.description;
    if (dto.status !== undefined) document.status = dto.status;
    return this.documentRepo.save(document);
  }

  /** Content re-upload; snapshots a new DocumentVersion. */
  async uploadContent(
    id: string,
    dto: UploadDocumentContentDto,
    userId: string,
  ): Promise<DocumentVersion> {
    const document = await this.findOne(id, userId);

    if (document.signedAt && !dto.requireResign) {
      throw new ConflictException(
        'Document is signed; set requireResign=true to replace its content and invalidate the signature',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const nextVersion = document.currentVersion + 1;
      const version = await manager.save(
        manager.create(DocumentVersion, {
          documentId: document.id,
          version: nextVersion,
          storageKey: dto.storageKey,
          checksum: dto.checksum,
          mimeType: dto.mimeType ?? null,
          uploadedBy: userId,
          changeNote: dto.changeNote ?? null,
        }),
      );

      document.currentVersion = nextVersion;
      document.storageKey = dto.storageKey;
      document.checksum = dto.checksum;
      document.mimeType = dto.mimeType ?? document.mimeType;
      if (document.signedAt) {
        document.signedAt = null;
        document.signedBy = null;
        document.signedChecksum = null;
        document.status = DocumentStatus.ACTIVE;
      }
      await manager.save(document);
      return version;
    });
  }

  async sign(id: string, userId: string): Promise<Document> {
    const document = await this.findOne(id, userId);
    document.signedAt = new Date();
    document.signedBy = userId;
    document.signedChecksum = document.checksum;
    document.status = DocumentStatus.SIGNED;
    return this.documentRepo.save(document);
  }

  async verifySignatures(
    id: string,
    userId: string,
  ): Promise<{ signed: boolean; valid: boolean; version: number }> {
    const document = await this.findOne(id, userId);
    return {
      signed: !!document.signedAt,
      valid:
        !!document.signedAt && document.signedChecksum === document.checksum,
      version: document.currentVersion,
    };
  }

  async listVersions(id: string, userId: string): Promise<DocumentVersion[]> {
    await this.findOne(id, userId);
    return this.versionRepo.find({
      where: { documentId: id },
      order: { version: 'DESC' },
    });
  }
}
