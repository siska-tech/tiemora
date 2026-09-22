// Inventory items are the physical things a store rents out. A product (catalog) is the design;
// an inventory item is one real copy of it, named <product id>-<2 digit sequence>: sample-rental-001-01.
export const ITEM_STATUSES = ['available', 'reserved', 'rented', 'maintenance', 'inactive'];
// Statuses that can never be booked, whatever the dates.
export const BLOCKED_ITEM = ['maintenance', 'inactive'];
// Statuses meaning "physically not on the shelf right now".
export const OUT_NOW = ['reserved', 'rented'];

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const inventoryItemId = (productId, sequence) => `${productId}-${String(sequence).padStart(2, '0')}`;
// The id an admin form suggests next: the first free <product>-NN after the existing items.
export function nextInventoryItemId(productId, existingIds) {
  const taken = new Set(existingIds);
  let n = existingIds.length + 1;
  while (taken.has(inventoryItemId(productId, n))) n++;
  return inventoryItemId(productId, n);
}
