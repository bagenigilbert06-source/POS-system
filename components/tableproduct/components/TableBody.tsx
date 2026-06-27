'use client';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import Dropdown from './btn/Dropdown';
import { Badge } from '@/components/ui/badge';
import { CatProduct } from '@prisma/client';
import SkeletonRow from '@/components/skeleton/products';
import { useState, useEffect } from 'react';

// Define the shape of product data
interface ProductData {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  buyingPrice: string;
  sellingPrice: string;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  userId: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the props for the TableBodyProduct component
interface TableBodyProductProps {
  data: ProductData[];
}

// TableBodyProduct component to render the table body for products
const TableBodyProduct: React.FC<TableBodyProductProps> = ({ data }) => {
  // State to manage loading state
  const [loading, setLoading] = useState<boolean>(true);
  // State to manage product data
  const [productData, setProductData] = useState<ProductData[]>([]);

  // useEffect to simulate data fetching
  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      setProductData(data);
      setLoading(false);
    }, 1000); // Simulate a delay of 1 second
  }, [data]);

  return (
    <TableBody>
      {/* Render skeleton rows if loading */}
      {loading
        ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        : // Render product data if not loading
          productData.map((item) => (
            <TableRow key={item.id}>
              {/* Render product name */}
              <TableCell className="font-medium pl-4">
                {item.name}
              </TableCell>
              {/* Render product SKU */}
              <TableCell className="pl-4">
                <Badge variant="outline">
                  {item.sku || 'N/A'}
                </Badge>
              </TableCell>
              {/* Render product sell price */}
              <TableCell className="pl-5">KES {item.sellingPrice}</TableCell>
              {/* Render product stock */}
              <TableCell className="hidden md:table-cell pl-6">
                {item.stock}
              </TableCell>
              {/* Render product buying price */}
              <TableCell className="hidden md:table-cell pl-4">
                KES {item.buyingPrice}
              </TableCell>
              {/* Render dropdown for product actions */}
              <TableCell>
                <Dropdown product={item} />
              </TableCell>
            </TableRow>
          ))}
    </TableBody>
  );
};

export default TableBodyProduct;
