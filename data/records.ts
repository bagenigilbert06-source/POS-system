import { db } from '@/lib/db';
import { sale, saleItem } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';
import isOnline from 'is-online';

export const fetchRecords = async ({
  take = 5,
  skip = 0,
  query,
}: {
  query?: string;
  take: number;
  skip: number;
}) => {
  const isOnlineResult = await isOnline();

  if (!isOnlineResult) {
    throw new Error('No internet connection');
    return;
  }

  'use server';
  try {
    const whereCondition = query ? ilike(sale.id, `%${query}%`) : undefined;

    const results = await db
      .select({
        id: sale.id,
        totalAmount: sale.total,
        createdAt: sale.createdAt,
        isComplete: sale.status,
      })
      .from(sale)
      .where(whereCondition)
      .limit(take)
      .offset(skip)
      .orderBy(sale.createdAt);

    // Get sale items for total quantity calculation
    const resultsWithItems = await Promise.all(
      results.map(async (transaction) => {
        const items = await db
          .select({
            id: saleItem.id,
            productId: saleItem.productId,
            quantity: saleItem.quantity,
          })
          .from(saleItem)
          .where(ilike(saleItem.saleId, transaction.id));

        const totalQuantity = items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        return {
          ...transaction,
          totalQuantity,
          products: items,
        };
      })
    );

    const totalRecordsResult = await db.select({ id: sale.id }).from(sale).where(whereCondition);
    const totalTransactions = totalRecordsResult.length;

    return {
      data: resultsWithItems,
      metadata: {
        hasNextPage: skip + take < totalTransactions,
        totalPages: Math.ceil(totalTransactions / take),
      },
    };
  } catch (error) {
    console.error('Error fetching records:', error);
    throw error;
  }
};
