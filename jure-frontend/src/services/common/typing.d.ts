declare namespace API {
    type Paginated<T> = {
        count: number
        last_page: number
        page_size:number
        page:number
        next:number | null
        previous:number | null
        results:T[]
    }
}