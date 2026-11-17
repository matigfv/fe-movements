import { useQuery } from "@tanstack/react-query";
import {
  getItemDescriptionsApi,
  getItemPriceHistoryApi,
} from "@/apis/movement/MovementApi";

export const useItemDescriptions = (enabled: boolean) =>
  useQuery({
    queryKey: ["movement-item-descriptions"],
    queryFn: getItemDescriptionsApi,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export const useItemPriceHistory = (description: string) =>
  useQuery({
    queryKey: ["movement-item-price-history", description],
    queryFn: () => getItemPriceHistoryApi(description),
    staleTime: 5 * 60 * 1000,
  });
