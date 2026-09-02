/** The shapes every section renders from, whatever the data source is. */

export type Podcast = {
  id: string;
  title: string;
  category: string;
  episodeLabel: string;
  description: string;
  durationLabel: string;
  listenersLabel: string;
  artwork: string;
  /** Focal crop for the 320x280 thumbnail, as CSS object-position. */
  artworkPosition?: string;
  url?: string;
};

export type Creator = {
  id: string;
  name: string;
  listenersLabel: string;
  photo: string;
  /** Focal crop for the portrait, as CSS object-position. */
  photoPosition?: string;
  url?: string;
};

export type Category = {
  slug: string;
  name: string;
  showsLabel: string;
  icon: string;
  /** Resting card height in the staggered row (px at 1440). */
  height: 200 | 240 | 280 | 320;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  photo: string;
  photoPosition?: string;
};
