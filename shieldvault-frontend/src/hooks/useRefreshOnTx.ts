import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRefreshOnTx(isSuccess: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSuccess) {
      // Invalidate all wagmi contract read queries
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
      queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    }
  }, [isSuccess, queryClient]);
}