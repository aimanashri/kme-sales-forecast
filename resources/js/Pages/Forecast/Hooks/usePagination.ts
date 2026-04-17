import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / itemsPerPage);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }, [data, currentPage, itemsPerPage]);

    const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
    const goToPrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

    return { 
        currentPage, 
        setCurrentPage, 
        totalPages, 
        paginatedData, 
        goToNextPage, 
        goToPrevPage 
    };
}