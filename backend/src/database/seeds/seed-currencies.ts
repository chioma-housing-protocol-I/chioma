import { DataSource } from 'typeorm';
import { SupportedCurrency } from '../../modules/transactions/entities/supported-currency.entity';
import { createScriptLogger } from '../../common/services/script-logger';

const logger = createScriptLogger('seed-currencies');

export async function seedSupportedCurrencies(dataSource: DataSource) {
  const currencyRepo = dataSource.getRepository(SupportedCurrency);

  const currencies = [
    {
      code: 'USD',
      name: 'US Dollar',
      anchorUrl:
        process.env.ANCHOR_API_URL || 'https://api.anchor-provider.com',
      stellarAssetCode: 'USDC',
      stellarAssetIssuer:
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      isActive: true,
    },
    {
      code: 'EUR',
      name: 'Euro',
      anchorUrl:
        process.env.ANCHOR_API_URL || 'https://api.anchor-provider.com',
      stellarAssetCode: 'USDC',
      stellarAssetIssuer:
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      isActive: true,
    },
    {
      code: 'GBP',
      name: 'British Pound',
      anchorUrl:
        process.env.ANCHOR_API_URL || 'https://api.anchor-provider.com',
      stellarAssetCode: 'USDC',
      stellarAssetIssuer:
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      isActive: true,
    },
    {
      code: 'NGN',
      name: 'Nigerian Naira',
      anchorUrl:
        process.env.ANCHOR_API_URL || 'https://api.anchor-provider.com',
      stellarAssetCode: 'USDC',
      stellarAssetIssuer:
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      isActive: true,
    },
  ];

  for (const currency of currencies) {
    const existing = await currencyRepo.findOne({
      where: { code: currency.code },
    });

    if (!existing) {
      const newCurrency = currencyRepo.create(currency);
      await currencyRepo.save(newCurrency);
      logger.log(`Seeded currency: ${currency.code}`);
    } else {
      logger.debug(`Currency already exists: ${currency.code}`);
    }
  }

  logger.log('Currency seeding completed');
}

// Run if executed directly
if (require.main === module) {
  void import('../../database/data-source').then(async ({ AppDataSource }) => {
    try {
      await AppDataSource.initialize();
      logger.log('Database connected');

      await seedSupportedCurrencies(AppDataSource);

      await AppDataSource.destroy();
      logger.log('Database connection closed');
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Seeding failed', {
        error: message,
        stack: error?.stack,
      });
      process.exit(1);
    }
  });
}
