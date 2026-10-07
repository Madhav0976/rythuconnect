'use client';

import React, { useState } from 'react';
import { Category, MarketplaceQuery, MarketplaceSortOption } from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { Button, Input, Select } from '@/components/ui';

interface FilterPanelProps {
  categories: Category[];
  currentQuery: MarketplaceQuery;
  onApply: (filters: Partial<MarketplaceQuery>) => void;
  onClear: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  currentQuery,
  onApply,
  onClear,
}) => {
  const { t, language } = useTranslation();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Local state for filter inputs
  const [search, setSearch] = useState(currentQuery.search || '');
  const [categoryId, setCategoryId] = useState(currentQuery.categoryId || '');
  const [minPrice, setMinPrice] = useState(
    currentQuery.minPrice !== undefined ? String(currentQuery.minPrice) : ''
  );
  const [maxPrice, setMaxPrice] = useState(
    currentQuery.maxPrice !== undefined ? String(currentQuery.maxPrice) : ''
  );
  const [location, setLocation] = useState(currentQuery.location || '');
  const [sort, setSort] = useState<MarketplaceSortOption>(currentQuery.sort || 'newest');
  const [priceError, setPriceError] = useState<string | null>(null);

  const activeFilterCount = [
    Boolean(currentQuery.search),
    Boolean(currentQuery.categoryId),
    currentQuery.minPrice !== undefined,
    currentQuery.maxPrice !== undefined,
    Boolean(currentQuery.location),
    currentQuery.sort && currentQuery.sort !== 'newest',
  ].filter(Boolean).length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPriceError(null);

    const minNum = minPrice.trim() !== '' ? Number(minPrice) : undefined;
    const maxNum = maxPrice.trim() !== '' ? Number(maxPrice) : undefined;

    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
      setPriceError('Min price cannot be greater than max price');
      return;
    }

    onApply({
      search: search.trim() || undefined,
      categoryId: categoryId.trim() || undefined,
      minPrice: minNum,
      maxPrice: maxNum,
      location: location.trim() || undefined,
      sort,
    });

    setIsOpenMobile(false);
  };

  const handleClear = () => {
    setSearch('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setSort('newest');
    setPriceError(null);
    onClear();
    setIsOpenMobile(false);
  };

  const getCategoryLabel = (cat: Category) => {
    if (cat.translations && typeof cat.translations === 'object') {
      const trans = (cat.translations as Record<string, string | undefined>)[language];
      if (trans) return trans;
    }
    return cat.name;
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Mobile Toggle Bar */}
      <div className="flex items-center justify-between md:hidden pb-1 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="flex items-center gap-2 text-sm font-bold text-slate-800 focus:outline-hidden"
          aria-expanded={isOpenMobile}
        >
          <span>🔍 {t('marketplace.filter_title')}</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {activeFilterCount}
            </span>
          )}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="text-xs text-slate-600"
        >
          {isOpenMobile ? '▲ Hide' : '▼ Show'}
        </Button>
      </div>

      {/* Main Filter Content */}
      <form
        onSubmit={handleSubmit}
        className={`space-y-4 ${isOpenMobile ? 'block' : 'hidden md:block'}`}
      >
        {/* Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Crop Search */}
          <div className="md:col-span-4 space-y-1">
            <label htmlFor="filter-search" className="block text-xs font-semibold text-slate-700">
              {t('marketplace.search_placeholder')}
            </label>
            <Input
              id="filter-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.search_placeholder')}
              className="text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3 space-y-1">
            <label htmlFor="filter-category" className="block text-xs font-semibold text-slate-700">
              {t('marketplace.filter_category')}
            </label>
            <Select
              id="filter-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="text-sm"
            >
              <option value="">{t('marketplace.all_categories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </Select>
          </div>

          {/* Location Filter */}
          <div className="md:col-span-3 space-y-1">
            <label htmlFor="filter-location" className="block text-xs font-semibold text-slate-700">
              {t('marketplace.filter_location')}
            </label>
            <Input
              id="filter-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('marketplace.location_placeholder')}
              className="text-sm"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-2 space-y-1">
            <label htmlFor="filter-sort" className="block text-xs font-semibold text-slate-700">
              {t('marketplace.sort_by')}
            </label>
            <Select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as MarketplaceSortOption)}
              className="text-sm"
            >
              <option value="newest">{t('marketplace.sort_newest')}</option>
              <option value="price_asc">{t('marketplace.sort_price_asc')}</option>
              <option value="price_desc">{t('marketplace.sort_price_desc')}</option>
              <option value="harvest_date">{t('marketplace.sort_harvest_date')}</option>
            </Select>
          </div>
        </div>

        {/* Second Row: Price Range & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-1">
          {/* Price Range */}
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <label htmlFor="filter-min-price" className="block text-xs font-semibold text-slate-700">
                {t('marketplace.min_price')}
              </label>
              <Input
                id="filter-min-price"
                type="number"
                min="0"
                step="any"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                className="w-28 text-sm"
              />
            </div>
            <span className="text-slate-400 font-bold self-end pb-2.5">—</span>
            <div className="space-y-1">
              <label htmlFor="filter-max-price" className="block text-xs font-semibold text-slate-700">
                {t('marketplace.max_price')}
              </label>
              <Input
                id="filter-max-price"
                type="number"
                min="0"
                step="any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="9999"
                className="w-28 text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-end pt-2 sm:pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1 sm:flex-initial"
            >
              {t('marketplace.clear_filters')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1 sm:flex-initial shadow-xs"
            >
              🔍 {t('marketplace.apply_filters')}
            </Button>
          </div>
        </div>

        {priceError && (
          <p className="text-xs text-red-600 font-medium" role="alert">
            {priceError}
          </p>
        )}
      </form>
    </div>
  );
};
