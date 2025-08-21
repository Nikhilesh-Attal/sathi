// import axios from "axios";

// export interface OpenStreetMapPlace {
//   name: string;
//   category: string;
//   address: string;
//   coordinates: {
//     latitude: number;
//     longitude: number;
//   };
//   distance?: number;
//   osm_id?: string;
//   osm_type?: string;
//   source: string;
// }

// export interface OSMSearchParams {
//   latitude: number;
//   longitude: number;
//   radius?: number;
//   tags?: string[];
//   limit?: number;
// }

// class OpenStreetMapTool {
//   private baseUrl = 'https://nominatim.openstreetmap.org';
//   private userAgent = 'GeolocationService/1.0';
//   private rateLimitDelay = 1000; // 1 second between requests
//   private lastRequestTime = 0;

//   /**
//    * Rate limiting to respect Nominatim usage policy
//    */
//   private async enforceRateLimit(): Promise<void> {
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;
    
//     if (timeSinceLastRequest < this.rateLimitDelay) {
//       const delay = this.rateLimitDelay - timeSinceLastRequest;
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
    
//     this.lastRequestTime = Date.now();
//   }

//   /**
//    * Get headers for OpenStreetMap requests
//    */
//   private getHeaders() {
//     return {
//       'User-Agent': this.userAgent,
//       'Accept': 'application/json',
//       'Accept-Language': 'en'
//     };
//   }

//   /**
//    * Calculate distance between two coordinates (Haversine formula)
//    */
//   private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371000; // Earth's radius in meters
//     const dLat = this.toRadians(lat2 - lat1);
//     const dLon = this.toRadians(lon2 - lon1);
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   }

//   /**
//    * Convert degrees to radians
//    */
//   private toRadians(degrees: number): number {
//     return degrees * (Math.PI/180);
//   }

//   /**
//    * Geocode an address to coordinates
//    */
//   async geocode(address: string): Promise<{
//     latitude: number;
//     longitude: number;
//     formatted_address: string;
//   } | null> {
//     try {
//       await this.enforceRateLimit();
      
//       const params = new URLSearchParams({
//         q: address,
//         format: 'json',
//         addressdetails: '1',
//         limit: '1',
//         extratags: '1'
//       });
      
//       const url = `${this.baseUrl}/search?${params}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data || response.data.length === 0) {
//         return null;
//       }

//       const result = response.data[0];
      
//       return {
//         latitude: parseFloat(result.lat),
//         longitude: parseFloat(result.lon),
//         formatted_address: result.display_name
//       };
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Geocoding error:', error.message);
//       return null;
//     }
//   }

//   /**
//    * Reverse geocode coordinates to address
//    */
//   async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
//     try {
//       await this.enforceRateLimit();
      
//       const params = new URLSearchParams({
//         lat: latitude.toString(),
//         lon: longitude.toString(),
//         format: 'json',
//         addressdetails: '1',
//         zoom: '18'
//       });
      
//       const url = `${this.baseUrl}/reverse?${params}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data || response.data.error) {
//         return null;
//       }
      
//       return response.data.display_name;
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Reverse geocoding error:', error.message);
//       return null;
//     }
//   }

//   /**
//    * Search for places nearby using Nominatim
//    */
//   async searchNearby(params: OSMSearchParams): Promise<OpenStreetMapPlace[]> {
//     try {
//       await this.enforceRateLimit();
      
//       const { latitude, longitude, radius = 5000, tags = [], limit = 20 } = params;
      
//       // Calculate bounding box from center point and radius
//       const radiusInDegrees = radius / 111320; // Convert meters to degrees (approximate)
      
//       const bbox = [
//         longitude - radiusInDegrees, // left
//         latitude - radiusInDegrees,  // bottom
//         longitude + radiusInDegrees, // right
//         latitude + radiusInDegrees   // top
//       ].join(',');

//       // Build query based on tags
//       let query = '';
//       if (tags.length > 0) {
//         query = tags.join(' OR ');
//       } else {
//         query = '[tourism] OR [amenity] OR [leisure]';
//       }
      
//       const searchParams = new URLSearchParams({
//         q: query,
//         format: 'json',
//         addressdetails: '1',
//         extratags: '1',
//         bounded: '1',
//         viewbox: bbox,
//         limit: limit.toString()
//       });
      
//       const url = `${this.baseUrl}/search?${searchParams}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data) {
//         return [];
//       }
      
//       // src/ai/tools/openstreetmap-tool.ts
// const OSM_CONTACT_EMAIL = process.env.OSM_CONTACT_EMAIL || 'support@example.com';

// function osmHeaders() {
//   return {
//     'User-Agent': `SathiApp/1.0 (${OSM_CONTACT_EMAIL})`,
//     'Accept-Language': 'en',
//     'Referer': 'https://yourdomain.example',
//   };
// }

// // example usage
// const resp = await axios.get(url, { headers: osmHeaders(), params: { email: process.env.OSM_CONTACT_EMAIL } });

//       const places = response.data.map((place: any) => {
//         const placeLat = parseFloat(place.lat);
//         const placeLon = parseFloat(place.lon);
//         const distance = this.calculateDistance(latitude, longitude, placeLat, placeLon);
        
//         return {
//           name: place.display_name.split(',')[0] || 'Unknown Place',
//           category: place.class || place.type || 'place',
//           address: place.display_name,
//           coordinates: {
//             latitude: placeLat,
//             longitude: placeLon
//           },
//           distance: Math.round(distance),
//           osm_id: place.osm_id,
//           osm_type: place.osm_type,
//           source: 'openstreetmap'
//         };
//       }).filter((place: OpenStreetMapPlace) => place.distance! <= radius);
      
//       return places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Search nearby error:', error.message);
//       return [];
//     }
//   }
// }

// // Create singleton instance
// const osmTool = new OpenStreetMapTool();

// export async function fetchPlacesFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching attractions for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"tourism"="attraction"', '"tourism"="museum"', '"tourism"="gallery"', '"historic"'],
//     limit: 20
//   });
// }

// export async function fetchHotelsFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching hotels for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"tourism"="hotel"', '"tourism"="hostel"', '"tourism"="guest_house"'],
//     limit: 20
//   });
// }

// export async function fetchRestaurantsFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching restaurants for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"amenity"="restaurant"', '"amenity"="cafe"', '"amenity"="fast_food"'],
//     limit: 20
//   });
// }

// export async function geocodeWithOpenStreetMap(address: string): Promise<{
//   latitude: number;
//   longitude: number;
//   formatted_address: string;
// } | null> {
//   return osmTool.geocode(address);
// }

// export async function reverseGeocodeWithOpenStreetMap(
//   latitude: number, 
//   longitude: number
// ): Promise<string | null> {
//   return osmTool.reverseGeocode(latitude, longitude);
// }

// import axios from "axios";

// export interface OpenStreetMapPlace {
//   name: string;
//   category: string;
//   address: string;
//   coordinates: {
//     latitude: number;
//     longitude: number;
//   };
//   distance?: number;
//   osm_id?: string;
//   osm_type?: string;
//   source: string;
// }

// export interface OSMSearchParams {
//   latitude: number;
//   longitude: number;
//   radius?: number;
//   tags?: string[];
//   limit?: number;
// }

// class OpenStreetMapTool {
//   private baseUrl = 'https://nominatim.openstreetmap.org';
//   private userAgent = 'GeolocationService/1.0';
//   private rateLimitDelay = 1000; // 1 second between requests
//   private lastRequestTime = 0;

//   /**
//    * Rate limiting to respect Nominatim usage policy
//    */
//   private async enforceRateLimit(): Promise<void> {
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;
    
//     if (timeSinceLastRequest < this.rateLimitDelay) {
//       const delay = this.rateLimitDelay - timeSinceLastRequest;
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
    
//     this.lastRequestTime = Date.now();
//   }

//   /**
//    * Get headers for OpenStreetMap requests
//    */
//   private getHeaders() {
//     return {
//       'User-Agent': this.userAgent,
//       'Accept': 'application/json',
//       'Accept-Language': 'en'
//     };
//   }

//   /**
//    * Calculate distance between two coordinates (Haversine formula)
//    */
//   private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371000; // Earth's radius in meters
//     const dLat = this.toRadians(lat2 - lat1);
//     const dLon = this.toRadians(lon2 - lon1);
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   }

//   /**
//    * Convert degrees to radians
//    */
//   private toRadians(degrees: number): number {
//     return degrees * (Math.PI/180);
//   }

//   /**
//    * Geocode an address to coordinates
//    */
//   async geocode(address: string): Promise<{
//     latitude: number;
//     longitude: number;
//     formatted_address: string;
//   } | null> {
//     try {
//       await this.enforceRateLimit();
      
//       const params = new URLSearchParams({
//         q: address,
//         format: 'json',
//         addressdetails: '1',
//         limit: '1',
//         extratags: '1'
//       });
      
//       const url = `${this.baseUrl}/search?${params}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data || response.data.length === 0) {
//         return null;
//       }

//       const result = response.data[0];
      
//       return {
//         latitude: parseFloat(result.lat),
//         longitude: parseFloat(result.lon),
//         formatted_address: result.display_name
//       };
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Geocoding error:', error.message);
//       return null;
//     }
//   }

//   /**
//    * Reverse geocode coordinates to address
//    */
//   async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
//     try {
//       await this.enforceRateLimit();
      
//       const params = new URLSearchParams({
//         lat: latitude.toString(),
//         lon: longitude.toString(),
//         format: 'json',
//         addressdetails: '1',
//         zoom: '18'
//       });
      
//       const url = `${this.baseUrl}/reverse?${params}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data || response.data.error) {
//         return null;
//       }
      
//       return response.data.display_name;
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Reverse geocoding error:', error.message);
//       return null;
//     }
//   }

//   /**
//    * Search for places nearby using Nominatim
//    */
//   async searchNearby(params: OSMSearchParams): Promise<OpenStreetMapPlace[]> {
//     try {
//       await this.enforceRateLimit();
      
//       const { latitude, longitude, radius = 5000, tags = [], limit = 20 } = params;
      
//       // Calculate bounding box from center point and radius
//       const radiusInDegrees = radius / 111320; // Convert meters to degrees (approximate)
      
//       const bbox = [
//         longitude - radiusInDegrees, // left
//         latitude - radiusInDegrees,  // bottom
//         longitude + radiusInDegrees, // right
//         latitude + radiusInDegrees   // top
//       ].join(',');

//       // Build query based on tags
//       let query = '';
//       if (tags.length > 0) {
//         query = tags.join(' OR ');
//       } else {
//         query = '[tourism] OR [amenity] OR [leisure]';
//       }
      
//       const searchParams = new URLSearchParams({
//         q: query,
//         format: 'json',
//         addressdetails: '1',
//         extratags: '1',
//         bounded: '1',
//         viewbox: bbox,
//         limit: limit.toString()
//       });
      
//       const url = `${this.baseUrl}/search?${searchParams}`;
      
//       const response = await axios.get(url, {
//         headers: this.getHeaders(),
//         timeout: 10000
//       });

//       if (!response.data) {
//         return [];
//       }
      
//       console.log('[OpenStreetMap] Raw search results:', response.data);

//       // src/ai/tools/openstreetmap-tool.ts
// const OSM_CONTACT_EMAIL = process.env.OSM_CONTACT_EMAIL || 'support@example.com';

// function osmHeaders() {
//   return {
//     'User-Agent': `SathiApp/1.0 (${OSM_CONTACT_EMAIL})`,
//     'Accept-Language': 'en',
//     'Referer': 'http://localhost:3000',
//   };
// }

// // example usage
// const resp = await axios.get(url, { headers: osmHeaders(), params: { email: process.env.OSM_CONTACT_EMAIL } });

//       const places = response.data.map((place: any) => {
//         const placeLat = parseFloat(place.lat);
//         const placeLon = parseFloat(place.lon);
//         const distance = this.calculateDistance(latitude, longitude, placeLat, placeLon);
        
//         return {
//           name: place.display_name.split(',')[0] || 'Unknown Place',
//           category: place.class || place.type || 'place',
//           address: place.display_name,
//           coordinates: {
//             latitude: placeLat,
//             longitude: placeLon
//           },
//           distance: Math.round(distance),
//           osm_id: place.osm_id,
//           osm_type: place.osm_type,
//           source: 'openstreetmap'
//         };
//       }).filter((place: OpenStreetMapPlace) => place.distance! <= radius);
      
//       return places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
//     } catch (error: any) {
//       console.error('[OpenStreetMap] Search nearby error:', error.message);
//       return [];
//     }
//   }
// }

// // Create singleton instance
// const osmTool = new OpenStreetMapTool();

// export async function fetchPlacesFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching attractions for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"tourism"', '"amenity"', '"leisure"', '"tourism"="attraction"', '"tourism"="museum"', '"tourism"="gallery"', '"historic"'],
//     limit: 20
//   });
// }

// export async function fetchHotelsFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching hotels for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"tourism"="hotel"', '"tourism"="hostel"', '"tourism"="guest_house"', '"building"="hotel"', '"lodging"'],
//     limit: 20
//   });
// }

// export async function fetchRestaurantsFromOpenStreetMap(
//   latitude: number, 
//   longitude: number, 
//   radius: number = 5000
// ): Promise<OpenStreetMapPlace[]> {
//   console.log(`[OpenStreetMap] Fetching restaurants for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
//   return osmTool.searchNearby({
//     latitude,
//     longitude,
//     radius,
//     tags: ['"amenity"="restaurant"', '"amenity"="cafe"', '"amenity"="fast_food"', '"food"', '"eating_place"'],
//     limit: 20
//   });
// }

// export async function geocodeWithOpenStreetMap(address: string): Promise<{
//   latitude: number;
//   longitude: number;
//   formatted_address: string;
// } | null> {
//   return osmTool.geocode(address);
// }

// export async function reverseGeocodeWithOpenStreetMap(
//   latitude: number, 
//   longitude: number
// ): Promise<string | null> {
//   return osmTool.reverseGeocode(latitude, longitude);
// }



import axios from "axios";

export interface OpenStreetMapPlace {
  name: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  osm_id?: string;
  osm_type?: string;
  source: string;
}

export interface OSMSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  tags?: string[];
  limit?: number;
}

class OpenStreetMapTool {
  private nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  private overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
  private userAgent = 'GeolocationService/1.0';
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  /**
   * Rate limiting to respect API usage policy
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get headers for API requests
   */
  private getHeaders() {
    return {
      'User-Agent': this.userAgent,
      'Accept': 'application/json',
      'Accept-Language': 'en'
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<{
    latitude: number;
    longitude: number;
    formatted_address: string;
  } | null> {
    try {
      await this.enforceRateLimit();
      
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        extratags: '1'
      });
      
      const url = `${this.nominatimBaseUrl}/search?${params}`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const result = response.data[0];
      
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formatted_address: result.display_name
      };
    } catch (error: any) {
      console.error('[OpenStreetMap] Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      await this.enforceRateLimit();
      
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
        zoom: '18'
      });
      
      const url = `${this.nominatimBaseUrl}/reverse?${params}`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (!response.data || response.data.error) {
        return null;
      }
      
      return response.data.display_name;
    } catch (error: any) {
      console.error('[OpenStreetMap] Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Query Overpass API for nearby features
   */
  async queryOverpass(params: OSMSearchParams): Promise<OpenStreetMapPlace[]> {
    try {
      await this.enforceRateLimit();
      
      const { latitude, longitude, radius = 5000, tags = [], limit = 20 } = params;
      
      // Build Overpass QL query
      const radiusInMeters = radius;
      const queryTags = tags.length > 0 ? tags : ['tourism', 'amenity', 'leisure'];
      const query = `
        [out:json][timeout:25];
        (
          ${queryTags.map(tag => `node[${tag}](around:${radiusInMeters},${latitude},${longitude});`).join('\n')}
          ${queryTags.map(tag => `way[${tag}](around:${radiusInMeters},${latitude},${longitude});`).join('\n')}
        );
        out body;
        >;
        out skel qt;
      `;
      
      const response = await axios.post(this.overpassBaseUrl, query, {
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'text/plain'
        },
        timeout: 15000
      });

      if (!response.data || !response.data.elements) {
        console.log('[OpenStreetMap] No results from Overpass API');
        return [];
      }

      console.log('[OpenStreetMap] Raw Overpass data:', response.data);

      const places = response.data.elements
        .filter((element: any) => element.lat && element.lon && element.tags)
        .map((element: any) => {
          const placeLat = parseFloat(element.lat);
          const placeLon = parseFloat(element.lon);
          const distance = this.calculateDistance(latitude, longitude, placeLat, placeLon);
          
          // Determine category from tags
          const category = element.tags.tourism || element.tags.amenity || element.tags.leisure || 'place';
          
          // Build address from available tags
          let address = element.tags['addr:full'] || element.tags['addr:street'] || '';
          if (element.tags['addr:city']) {
            address += address ? ', ' + element.tags['addr:city'] : element.tags['addr:city'];
          }
          
          return {
            name: element.tags.name || 'Unknown Place',
            category: category,
            address: address || 'Address not available',
            coordinates: {
              latitude: placeLat,
              longitude: placeLon
            },
            distance: Math.round(distance),
            osm_id: element.id.toString(),
            osm_type: element.type,
            source: 'openstreetmap'
          };
        })
        .filter((place: OpenStreetMapPlace) => place.distance! <= radius);
      
      return places
        .sort((a: OpenStreetMapPlace, b: OpenStreetMapPlace) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);
    } catch (error: any) {
      console.error('[OpenStreetMap] Overpass query error:', error.message);
      return [];
    }
  }

  /**
   * Search for places nearby using Nominatim (retained for compatibility)
   */
  async searchNearby(params: OSMSearchParams): Promise<OpenStreetMapPlace[]> {
    try {
      await this.enforceRateLimit();
      
      const { latitude, longitude, radius = 5000, tags = [], limit = 20 } = params;
      
      // Calculate bounding box from center point and radius
      const radiusInDegrees = radius / 111320; // Convert meters to degrees (approximate)
      
      const bbox = [
        longitude - radiusInDegrees, // left
        latitude - radiusInDegrees,  // bottom
        longitude + radiusInDegrees, // right
        latitude + radiusInDegrees   // top
      ].join(',');

      // Build query based on tags
      let query = '';
      if (tags.length > 0) {
        query = tags.join(' OR ');
      } else {
        query = '[tourism] OR [amenity] OR [leisure]';
      }
      
      const searchParams = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        bounded: '1',
        viewbox: bbox,
        limit: limit.toString()
      });
      
      const url = `${this.nominatimBaseUrl}/search?${searchParams}`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (!response.data) {
        return [];
      }
      
      console.log('[OpenStreetMap] Raw search results:', response.data);

      const places = response.data.map((place: any) => {
        const placeLat = parseFloat(place.lat);
        const placeLon = parseFloat(place.lon);
        const distance = this.calculateDistance(latitude, longitude, placeLat, placeLon);
        
        return {
          name: place.display_name.split(',')[0] || 'Unknown Place',
          category: place.class || place.type || 'place',
          address: place.display_name,
          coordinates: {
            latitude: placeLat,
            longitude: placeLon
          },
          distance: Math.round(distance),
          osm_id: place.osm_id,
          osm_type: place.osm_type,
          source: 'openstreetmap'
        };
      }).filter((place: OpenStreetMapPlace) => place.distance! <= radius);
      
      return places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error: any) {
      console.error('[OpenStreetMap] Search nearby error:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const osmTool = new OpenStreetMapTool();

export async function fetchPlacesFromOpenStreetMap(
  latitude: number, 
  longitude: number, 
  radius: number = 5000
): Promise<OpenStreetMapPlace[]> {
  console.log(`[OpenStreetMap] Fetching attractions for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
  return osmTool.queryOverpass({
    latitude,
    longitude,
    radius,
    tags: ['tourism=attraction', 'tourism=museum', 'tourism=gallery', 'historic'],
    limit: 20
  });
}

export async function fetchHotelsFromOpenStreetMap(
  latitude: number, 
  longitude: number, 
  radius: number = 5000
): Promise<OpenStreetMapPlace[]> {
  console.log(`[OpenStreetMap] Fetching hotels for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
  return osmTool.queryOverpass({
    latitude,
    longitude,
    radius,
    tags: ['tourism=hotel', 'tourism=hostel', 'tourism=guest_house', 'building=hotel'],
    limit: 20
  });
}

export async function fetchRestaurantsFromOpenStreetMap(
  latitude: number, 
  longitude: number, 
  radius: number = 5000
): Promise<OpenStreetMapPlace[]> {
  console.log(`[OpenStreetMap] Fetching restaurants for lat: ${latitude}, lon: ${longitude}, radius: ${radius}m`);
  
  return osmTool.queryOverpass({
    latitude,
    longitude,
    radius,
    tags: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
    limit: 20
  });
}

export async function geocodeWithOpenStreetMap(address: string): Promise<{
  latitude: number;
  longitude: number;
  formatted_address: string;
} | null> {
  return osmTool.geocode(address);
}

export async function reverseGeocodeWithOpenStreetMap(
  latitude: number, 
  longitude: number
): Promise<string | null> {
  return osmTool.reverseGeocode(latitude, longitude);
}