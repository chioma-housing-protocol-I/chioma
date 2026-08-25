import {
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

  async findAll(
    ownerId: string,
    filters: DocumentFilterDto,
  ): Promise<{
    documents: Document[];
    total: number;
    page: number;
    limit: number;
  }> {
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

    const page = filters.page ?? 0;
    const limit = filters.limit ?? 20;

    query
      .orderBy('doc.createdAt', 'DESC')
      .skip(page * limit)
      .take(limit);

    const [documents, total] = await query.getManyAndCount();

    return { documents, total, page, limit };
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

  async findSharedWithUser(userId: string): Promise<Document[]> {
    return this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.sharedWith LIKE :userId', { userId: `%${userId}%` })
      .orderBy('doc.createdAt', 'DESC')
      .getMany();
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
