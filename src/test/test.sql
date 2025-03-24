with articles as (
    select
        distinct c.article_id
    from dim.dim_groot_gamiel_article a 
    left join dim.dim_va_fv_article b on a.id=b.source_id
    join dim.dim_article c 
    on b.open_article_id=c.article_id
    where a.author_id = 'art_hot'
    and c.disable = 0
)
select
    concat_ws('-',year,month,day) dt,
    'vivo' platform,
    count(distinct case when a.play_num >0 then b.article_id end) played_count,
    sum(a.play_num) play_num
from dm_video.dm_video_vivo_play a 
join articles b 
on a.video_id=b.article_id
where concat(year,month,day) >= 20250301
group by concat_ws('-',year,month,day)
order by dt

union all

select
    concat_ws('-',year,month,day) dt,
    'xm' platform,
    count(distinct b.article_id) played_count,
    count(1) play_num
from dwd.dwd_base_backend_server a 
join articles b on a.request_map['id'] = b.article_id and a.request_path = '/xm2024/article' and a.request_map['id']=b.fuck['id']
join dim.dim_article c on a.fuck['id'] = c.article_id
where year = 2025
and month = 03
and request_path = '/xm2024/article'
group by concat_ws('-',year,month,day)
order by dt