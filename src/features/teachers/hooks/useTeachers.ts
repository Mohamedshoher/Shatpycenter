import { useQuery } from "@tanstack/react-query";
import { getTeachers } from "../services/teacherService";

export const useTeachers = () => {
    return useQuery({
        queryKey: ['teachers'],
        queryFn: getTeachers
    });
};
