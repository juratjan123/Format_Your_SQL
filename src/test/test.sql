select
    b.outer_id,
    b.outer_platform,
    b.author,
    b.author_id,
    b.title,
    b.category,
    b.duration,
    b.url,
    b.create_time,
    b.update_time,
    sum(a.plays) plays,
    cast(b.outer_id as string) as fuck1,
    cast(b.outer_id as int) fuck2,
    cast(a.plays as double) fuck3,
    cast(b.create_time as timestamp) as fuck4,
    cast(b.create_time as date) as fuck5,
    cast(b.create_time as bigint) as fuck6,
    cast(b.create_time as float) as fuck7,
    cast(b.create_time as boolean) as fuck8,
    cast(b.create_time as decimal(10,2)) as fuck9,
    cast(b.create_time as binary) as fuck10,
    cast(b.create_time as varchar) as fuck11
from dwm.dwm_phone_video_play a 
left join dim.dim_fe_xm_order b 
on a.video_id = b.yl_video_id
where a.access_key in ('ylsmfzg1vdvj')
and concat(year,month,day) >= from_unixtime(unix_timestamp(date_sub(current_date, 30)), 'yyyyMMdd')
order by plays desc, fuck1 desc, b.outer_id desc
limit 1000