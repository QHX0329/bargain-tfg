/**
 * Design System de BargAIn — Barrel export de componentes UI.
 *
 * Importa siempre desde '@/components/ui', nunca desde sub-archivos.
 */

export { BargainButton } from "./BargainButton";
export type {
  BargainButtonProps,
  ButtonVariant,
  ButtonSize,
} from "./BargainButton";

export { BottomTabBar } from "./BottomTabBar";
export type { BottomTabBarProps, TabDefinition } from "./BottomTabBar";

export { PriceTag } from "./PriceTag";
export type { PriceTagProps, PriceTagSize } from "./PriceTag";

export { ProductCard } from "./ProductCard";
export type { ProductCardProps, ProductCardVariant } from "./ProductCard";

export { SearchBar } from "./SearchBar";
export type { SearchBarProps } from "./SearchBar";
