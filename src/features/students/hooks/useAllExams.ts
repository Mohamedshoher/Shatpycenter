import { useQuery } from "@tanstack/react-query";
import { getAllExams } from "../services/recordsService";

export const useAllExams = (monthKey?: string) => {
    return useQuery({
        queryKey: ['all-exams', monthKey],
        queryFn: () => getAllExams(monthKey),
    });
};
