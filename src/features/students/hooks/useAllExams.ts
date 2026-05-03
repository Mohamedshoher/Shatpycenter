import { useQuery } from "@tanstack/react-query";
import { getAllExams } from "../services/recordsService";

export const useAllExams = (monthKey?: string, periodHalf?: 1 | 2) => {
    return useQuery({
        queryKey: ['all-exams', monthKey, periodHalf],
        queryFn: () => getAllExams(monthKey, periodHalf),
    });
};
