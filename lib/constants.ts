import { CategoryType } from "@prisma/client"

export const CATEGORY_CONFIG = {
  [CategoryType.WORK]: {
    name: "WORK",
    icon: "💼",
    color: "blue",
  },
  [CategoryType.SOURCE]: {
    name: "SOURCE",
    icon: "🎨",
    color: "purple",
  },
  [CategoryType.TEMPLATE]: {
    name: "TEMPLATE",
    icon: "📄",
    color: "green",
  },
  [CategoryType.BROCHURE]: {
    name: "BROCHURE",
    icon: "📖",
    color: "orange",
  },
  [CategoryType.ADMIN]: {
    name: "ADMIN",
    icon: "⚙️",
    color: "gray",
  },
  [CategoryType.ETC]: {
    name: "ETC",
    icon: "📁",
    color: "gray",
  },
} as const

