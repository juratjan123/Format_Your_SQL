select
        cp_id,
        cp_type,
        cp_name,
        last_time,
        cp_category
    from dm_cp.dm_cp_stat_sub
    WHERE 
        CASE 
            WHEN c.cp_type = 'ugc' THEN 
                NOT FIND_IN_SET('12', c.is_foster) > 0
                AND NOT FIND_IN_SET('123', c.is_foster) > 0
                AND NOT FIND_IN_SET('18', c.is_foster) > 0
                AND NOT FIND_IN_SET('47', c.chan_status) > 0
                AND NOT FIND_IN_SET('401', c.chan_status) > 0
                AND NOT FIND_IN_SET('86', c.chan_status) > 0
            WHEN c.cp_type = 'pgc' THEN 
                NOT FIND_IN_SET('13', c.is_foster) > 0
                AND NOT FIND_IN_SET('123', c.is_foster) > 0
                AND NOT FIND_IN_SET('18', c.is_foster) > 0
                AND NOT FIND_IN_SET('47', c.chan_status) > 0
                AND NOT FIND_IN_SET('83', c.chan_status) > 0
                AND NOT FIND_IN_SET('84', c.chan_status) > 0
                AND NOT FIND_IN_SET('85', c.chan_status) > 0
                AND NOT FIND_IN_SET('86', c.chan_status) > 0
                AND NOT FIND_IN_SET('87', c.chan_status) > 0
                AND NOT FIND_IN_SET('88', c.chan_status) > 0
                AND NOT FIND_IN_SET('21', c.chan_status) > 0
                AND NOT FIND_IN_SET('22', c.chan_status) > 0
                AND NOT FIND_IN_SET('23', c.chan_status) > 0
                AND NOT FIND_IN_SET('24', c.chan_status) > 0
                AND NOT FIND_IN_SET('25', c.chan_status) > 0
            ELSE FALSE
        END