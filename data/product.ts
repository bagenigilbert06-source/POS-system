import { db } from '@/lib/db';
import { product } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';
import isOnline from 'is-online';

export const fetchProduct = async ({
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
    const whereCondition = query ? ilike(product.name, `%${query}%`) : undefined;
    
    const results = await db
      .select()
      .from(product)
      .where(whereCondition)
      .limit(take)
      .offset(skip)
      .orderBy(product.name);

    const totalResult = await db
      .select({ count: product.id })
      .from(product)
      .where(whereCondition);

    const total = totalResult.length;

    return {
      data: results,
      metadata: {
        hasNextPage: skip + take < total,
        totalPages: Math.ceil(total / take),
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
