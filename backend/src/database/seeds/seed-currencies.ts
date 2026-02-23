import { DataSource } from 'typeorm';
import { SupportedCurrency } from '../../modules/transactions/entities/supported-currency.entity';

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
      console.log(`✓ Seeded currency: ${currency.code}`);
    } else {
      console.log(`- Currency already exists: ${currency.code}`);
    }
  }

  console.log('✓ Currency seeding completed');
}

// Run if executed directly
if (require.main === module) {
  void import('../../database/data-source').then(async ({ AppDataSource }) => {
    try {
      await AppDataSource.initialize();
      console.log('Database connected');

      await seedSupportedCurrencies(AppDataSource);

      await AppDataSource.destroy();
      console.log('Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  });
}
