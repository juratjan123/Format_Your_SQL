select
        cp_id,
        cp_type,
        cp_name,
        last_time,
        cp_category
    from dm_cp.dm_cp_stat_sub
    WHERE 
        fine_in_set('12', is_foster)=0