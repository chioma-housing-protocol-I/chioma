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
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Document, DocumentType } from './document.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentFilterDto,
  SignatureVerificationDto,
} from './dto/document.dto';
import { PaginationUtils } from '../../common/utils';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(dto: CreateDocumentDto, ownerId: string): Promise<Document> {
    const doc = this.documentRepo.create({
      name: dto.name,
      type: dto.type as DocumentType,
      category: dto.category,
      fileKey: dto.fileKey,
      fileSize: dto.fileSize,
      fileType: dto.fileType,
      propertyId: dto.propertyId ?? null,
      tenantId: dto.tenantId ?? null,
      ownerId,
      description: dto.description ?? null,
      status: 'ACTIVE',
    });
    return this.documentRepo.save(doc);
  }

  async findAll(ownerId: string, filters: DocumentFilterDto) {
    const query = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.ownerId = :ownerId', { ownerId });

    if (filters.status) {
      query.andWhere('doc.status = :status', { status: filters.status });
    }
    if (filters.type) {
      query.andWhere('doc.type = :type', { type: filters.type });
    }
    if (filters.category) {
      query.andWhere('doc.category = :category', {
        category: filters.category,
      });
    }
    if (filters.propertyId) {
      query.andWhere('doc.propertyId = :propertyId', {
        propertyId: filters.propertyId,
      });
    }
    if (filters.search) {
      query.andWhere(
        '(doc.name ILIKE :search OR doc.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    PaginationUtils.validatePagination(page, limit);

    query
      .orderBy('doc.createdAt', 'DESC')
      .skip(PaginationUtils.calculateOffset(page, limit))
      .take(limit);

    const [documents, total] = await query.getManyAndCount();

    return PaginationUtils.buildPaginationResponse(
      documents,
      total,
      page,
      limit,
    );
  }

  /**
   * The parties to a document: its owner, the tenant it concerns, and any
   * user it has been explicitly shared with. Only parties may retrieve or
   * sign the document.
   */
  private isParty(doc: Document, userId: string): boolean {
    return (
      doc.ownerId === userId ||
      doc.tenantId === userId ||
      (doc.sharedWith ?? []).includes(userId)
    );
  }

  async findOne(id: string, userId: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (!this.isParty(doc, userId)) {
      throw new ForbiddenException('Access denied');
    }
    return doc;
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    ownerId: string,
  ): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (doc.ownerId !== ownerId) {
      throw new ForbiddenException('Only the owner can update this document');
    }

    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.status !== undefined) doc.status = dto.status as Document['status'];
    if (dto.description !== undefined) doc.description = dto.description;

    return this.documentRepo.save(doc);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (doc.ownerId !== ownerId) {
      throw new ForbiddenException('Only the owner can delete this document');
    }
    doc.status = 'ARCHIVED';
    await this.documentRepo.softRemove(doc);
  }

  async share(
    id: string,
    tenantId: string,
    ownerId: string,
  ): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (doc.ownerId !== ownerId) {
      throw new ForbiddenException('Only the owner can share this document');
    }

    const shared = doc.sharedWith ?? [];
    if (!shared.includes(tenantId)) {
      shared.push(tenantId);
    }
    doc.sharedWith = shared;
    return this.documentRepo.save(doc);
  }

  async findSharedWithUser(userId: string, page = 1, limit = 20) {
    PaginationUtils.validatePagination(page, limit);

    const [documents, total] = await this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.sharedWith LIKE :userId', { userId: `%${userId}%` })
      .orderBy('doc.createdAt', 'DESC')
      .skip(PaginationUtils.calculateOffset(page, limit))
      .take(limit)
      .getManyAndCount();

    return PaginationUtils.buildPaginationResponse(
      documents,
      total,
      page,
      limit,
    );
  }

  /**
   * Capture a signature from one of the document's parties.
   *
   * The stored `payloadHash` binds the signature payload to the document's
   * content identifiers (`fileKey`, `fileSize`, `fileType`) at signing time;
   * `verifySignatures` recomputes it to detect tampering.
   */
  async sign(
    id: string,
    signerId: string,
    signatureData: string,
  ): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (!this.isParty(doc, signerId)) {
      throw new ForbiddenException('Only parties to the document can sign it');
    }
    if (doc.status !== 'ACTIVE') {
      throw new ConflictException('Only active documents can be signed');
    }

    const signatures = doc.signatures ?? [];
    if (signatures.some((s) => s.signerId === signerId)) {
      throw new ConflictException('Document already signed by this user');
    }

    const signedAt = new Date().toISOString();
    signatures.push({
      signerId,
      signedAt,
      signatureData,
      payloadHash: this.computeSignatureHash(
        doc,
        signerId,
        signedAt,
        signatureData,
      ),
    });
    doc.signatures = signatures;

    this.logger.log(`Document ${id} signed by ${signerId}`);
    return this.documentRepo.save(doc);
  }

  /**
   * Verify the integrity of every captured signature. A signature is valid
   * only if its stored hash matches a hash recomputed from the document's
   * current content identifiers — so any post-signing change to the file
   * reference invalidates it.
   */
  async verifySignatures(
    id: string,
    userId: string,
  ): Promise<SignatureVerificationDto> {
    const doc = await this.findOne(id, userId);
    const signatures = doc.signatures ?? [];

    const results = signatures.map((signature) => ({
      signerId: signature.signerId,
      signedAt: signature.signedAt,
      valid:
        signature.payloadHash ===
        this.computeSignatureHash(
          doc,
          signature.signerId,
          signature.signedAt,
          signature.signatureData,
        ),
    }));

    return {
      documentId: doc.id,
      signatureCount: results.length,
      allValid: results.length > 0 && results.every((r) => r.valid),
      signatures: results,
    };
  }

  private computeSignatureHash(
    doc: Document,
    signerId: string,
    signedAt: string,
    signatureData: string,
  ): string {
    return createHash('sha256')
      .update(
        [
          doc.id,
          doc.fileKey,
          String(doc.fileSize),
          doc.fileType,
          signerId,
          signedAt,
          signatureData,
        ].join('|'),
      )
      .digest('hex');
  }
}
