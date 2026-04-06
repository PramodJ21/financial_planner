import { create } from 'zustand';

const usePortfolioStore = create((set) => ({
    portfolios: [],
    activePortfolioId: null,
    focusedNode: null,         // { type: 'portfolio' | 'group' | 'holding', id }
    expandedGroups: new Set(),
    viewMode: 'simple',        // 'simple' | 'advanced'

    setPortfolios: (portfolios) => set({ portfolios }),
    setActivePortfolioId: (id) => set({ activePortfolioId: id, focusedNode: null }),
    setFocusedNode: (node) => set({ focusedNode: node }),
    setViewMode: (mode) => set({ viewMode: mode }),

    toggleGroupExpanded: (groupId) =>
        set((state) => {
            const next = new Set(state.expandedGroups);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return { expandedGroups: next };
        }),

    addPortfolio: (portfolio) =>
        set((state) => ({
            portfolios: [portfolio, ...state.portfolios],
            activePortfolioId: portfolio.id,
        })),

    removePortfolio: (id) =>
        set((state) => {
            const next = state.portfolios.filter((p) => p.id !== id);
            return {
                portfolios: next,
                activePortfolioId:
                    state.activePortfolioId === id
                        ? (next[0]?.id ?? null)
                        : state.activePortfolioId,
            };
        }),
}));

export default usePortfolioStore;
