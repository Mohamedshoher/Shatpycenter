import { useQuery } from "@tanstack/react-query";
import { getAllGoals } from "../services/recordsService";

export const useAllGoals = (studentIds?: string[], isCompleted?: boolean) => {
    return useQuery({
        queryKey: ['all-goals', studentIds?.length, isCompleted],
        queryFn: () => getAllGoals(studentIds, isCompleted),
    });
};
