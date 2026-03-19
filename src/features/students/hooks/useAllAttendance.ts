import { useQuery } from "@tanstack/react-query";
import { getAllAttendanceForMonth } from "../services/recordsService";

export const useAllAttendance = (monthKey: string) => {
    return useQuery({
        queryKey: ['all-attendance', monthKey],
        queryFn: () => getAllAttendanceForMonth(monthKey),
        enabled: !!monthKey
    });
};
