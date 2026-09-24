import { useQuery } from "@tanstack/react-query";
import { getAllExams } from "../services/recordsService";

export const useAllExams = (monthKey?: string, periodHalf?: 1 | 2, studentIds?: string[]) => {
    return useQuery({
        queryKey: ['all-exams', monthKey, periodHalf, studentIds?.length],
        queryFn: () => getAllExams(monthKey, periodHalf, studentIds),
    });
};
