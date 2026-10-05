// The shape of the API returns

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface UsersPage {
  users: User[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface FacetCount {
  value: string;
  count: number;
}
