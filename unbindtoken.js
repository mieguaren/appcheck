export default {
  async fetch(request) {
    const CONTENT_TYPE = { 'Content-Type': 'application/json' };
    const DEFAULT_NS = 'afk';
    const DEFAULT_CODE = '123456';
    const DEFAULT_MC = '';

    
      const url = new URL(request.url);
      const namespace = url.searchParams.get('namespace') || DEFAULT_NS;
      const code = url.searchParams.get('code') || DEFAULT_CODE;
      const mc = url.searchParams.get('mc') || DEFAULT_MC;

      const now = Math.floor(Date.now() / 1000);
      const edgeKV = new EdgeKV({ namespace });
      const rawData = await edgeKV.get(code);

      if (rawData == null) {
        return new Response(JSON.stringify({ result: "fail", keyValue: "1" }), { headers: CONTENT_TYPE });
      }

      // 解析成对象
      const value = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      // 过期判断
      if (value.exptime !== 0 && value.exptime < now) {
        await edgeKV.delete(code);
        return new Response(JSON.stringify({ result: "fail", keyValue: "2" }), { headers: CONTENT_TYPE });
      }

      if (!value.mc || value.mc.trim() === '') {
        const updatedValue = {
          valid: value.valid,
          time: value.time,
          exptime: value.exptime,
          mc: ''
        };
        await edgeKV.put(code, JSON.stringify(updatedValue));
        
        return new Response(JSON.stringify({
          result: "success",
          keyValue: updatedValue
        }), { headers: CONTENT_TYPE });
      }

      if (value.mc !== mc) {
        return new Response(JSON.stringify({
          result: "fail",
          keyValue: "3"
        }), { headers: CONTENT_TYPE });
      }

      const updatedValue = {
        valid: value.valid,
        time: value.time,
        exptime: value.exptime,
        mc: ''
      };
      await edgeKV.put(code, JSON.stringify(updatedValue));

      return new Response(JSON.stringify({
        result: "success",
        keyValue: updatedValue
      }), { headers: CONTENT_VALUE });
  }
};