import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Establishment, Product } from './api';

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  establishment: Establishment | null;
  items: CartLine[];
  itemCount: number;
  total: number;
  addItem: (establishment: Establishment, product: Product) => boolean;
  clearCart: () => void;
  setQuantity: (productId: number, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [establishment, setEstablishment] = useState<Establishment | null>(
    null,
  );
  const [items, setItems] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);
    const total = items.reduce(
      (sum, item) => sum + Number(item.product.precio) * item.quantity,
      0,
    );

    return {
      establishment,
      items,
      itemCount,
      total,
      addItem: (selectedEstablishment, product) => {
        if (
          establishment &&
          establishment.id !== selectedEstablishment.id
        ) {
          return false;
        }

        setEstablishment(selectedEstablishment);
        setItems((currentItems) => {
          const existingItem = currentItems.find(
            (item) => item.product.id === product.id,
          );

          if (existingItem) {
            return currentItems.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          }

          return [...currentItems, { product, quantity: 1 }];
        });

        return true;
      },
      clearCart: () => {
        setItems([]);
        setEstablishment(null);
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0 && items.length === 1) {
          setEstablishment(null);
        }

        setItems((currentItems) => {
          const updatedItems = currentItems
            .map((item) =>
              item.product.id === productId ? { ...item, quantity } : item,
            )
            .filter((item) => item.quantity > 0);

          return updatedItems;
        });
      },
    };
  }, [establishment, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart debe utilizarse dentro de CartProvider.');
  }

  return context;
}
