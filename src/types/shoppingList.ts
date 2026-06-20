export interface ShoppingListItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface SharedShoppingList {
  id: string;
  title?: string;
  items: ShoppingListItem[];
  updatedAt?: string;
}
