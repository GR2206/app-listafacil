export interface ShoppingListItem {
  id: string;
  text: string;
  checked: boolean;
}

/** Lista local (varias pestañas en Crear lista). */
export interface LocalShoppingList {
  id: string;
  title: string;
  items: ShoppingListItem[];
  updatedAt: string;
  /** Id Firestore si se compartió. */
  sharedId?: string | null;
}

export interface SharedShoppingList {
  id: string;
  title?: string;
  items: ShoppingListItem[];
  updatedAt?: string;
}
