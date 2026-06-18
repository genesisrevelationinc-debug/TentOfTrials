#ifndef BUDDY_H
#define BUDDY_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Minimum block size: 16 bytes (must be power of 2 and >= sizeof(void*)) */
#define BUDDY_MIN_BLOCK_SIZE 16

/* Default pool size: 64 MB */
#define BUDDY_DEFAULT_POOL_SIZE (64 * 1024 * 1024)

typedef struct buddy_block {
    struct buddy_block *next;
    size_t size;
    int free;
} buddy_block_t;

typedef struct {
    void *pool;
    size_t pool_size;
    buddy_block_t *free_list;
    size_t total_allocated;
    size_t current_usage;
    size_t peak_usage;
    size_t allocation_count;
    size_t free_count;
} buddy_t;

buddy_t *buddy_create(size_t pool_size);
void buddy_destroy(buddy_t *buddy);
void *buddy_alloc(size_t size);
void buddy_free(void *ptr);
void buddy_stats(void);

#ifdef __cplusplus
}
#endif

#endif /* BUDDY_H */