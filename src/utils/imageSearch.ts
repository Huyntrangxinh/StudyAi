export interface ImageSearchResult {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    user?: string;
    views?: number;
    downloads?: number;
}

export const searchImages = async (query: string): Promise<ImageSearchResult[]> => {
    if (!query.trim()) return [];

    const PIXABAY_API_KEY = '52964011-5fc353a36548e7363e6b02445';
    const response = await fetch(
        `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=12&safesearch=true`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch images');
    }

    const data = await response.json();

    return data.hits.map((hit: any) => ({
        id: hit.id.toString(),
        url: hit.largeImageURL,
        title: hit.tags || 'Image',
        thumbnail: hit.webformatURL,
        user: hit.user,
        views: hit.views,
        downloads: hit.downloads
    }));
};

