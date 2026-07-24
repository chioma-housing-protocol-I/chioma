import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Document, DocumentType } from './document.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentFilterDto,
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

  async findOne(id: string, ownerId: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    if (
      doc.ownerId !== ownerId &&
      (!doc.sharedWith || !doc.sharedWith.includes(ownerId))
    ) {
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
    await this.documentRepo.remove(doc);
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
}
