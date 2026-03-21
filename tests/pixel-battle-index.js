(function() {
    const t = document.createElement("link").relList;
    if (t && t.supports && t.supports("modulepreload"))
    return;
    for (const o of document.querySelectorAll('link[rel="modulepreload"]'))
    r(o);
    new MutationObserver(o => {
        for (const c of o)
        if (c.type === "childList")
        for (const u of c.addedNodes)
        u.tagName === "LINK" && u.rel === "modulepreload" && r(u)
    }
    ).observe(document, {
        childList: !0,
        subtree: !0
    });
    function n(o) {
        const c = {};
        return o.integrity && (c.integrity = o.integrity),
        o.referrerPolicy && (c.referrerPolicy = o.referrerPolicy),
        o.crossOrigin === "use-credentials" ? c.credentials = "include" : o.crossOrigin === "anonymous" ? c.credentials = "omit" : c.credentials = "same-origin",
        c
    }
    function r(o) {
        if (o.ep)
        return;
        o.ep = !0;
        const c = n(o);
        fetch(o.href, c)
    }
}
)();
var Et, A, Bn, Ce, un, En, Rn, $n, Qt, Kt, Zt, Mt = {}, Pt = [], xr = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, Je = Array.isArray;
function ve(e, t) {
    for (var n in t)
    e[n] = t[n];
    return e
}
function en(e) {
    e && e.parentNode && e.parentNode.removeChild(e)
}
function It(e, t, n) {
    var r, o, c, u = {};
    for (c in t)
    c == "key" ? r = t[c] : c == "ref" ? o = t[c] : u[c] = t[c];
    if (arguments.length > 2 && (u.children = arguments.length > 3 ? Et.call(arguments, 2) : n),
    typeof e == "function" && e.defaultProps != null)
    for (c in e.defaultProps)
    u[c] === void 0 && (u[c] = e.defaultProps[c]);
    return Nt(e, u, r, o, null)
}
function Nt(e, t, n, r, o) {
    var c = {
        type: e,
        props: t,
        key: n,
        ref: r,
        __k: null,
        __: null,
        __b: 0,
        __e: null,
        __c: null,
        constructor: void 0,
        __v: o ?? ++Bn,
        __i: -1,
        __u: 0
    };
    return o == null && A.vnode != null && A.vnode(c),
    c
}
function xe(e) {
    return e.children
}
function ye(e, t) {
    this.props = e,
    this.context = t
}
function Oe(e, t) {
    if (t == null)
    return e.__ ? Oe(e.__, e.__i + 1) : null;
    for (var n; t < e.__k.length; t++)
    if ((n = e.__k[t]) != null && n.__e != null)
    return n.__e;
    return typeof e.type == "function" ? Oe(e) : null
}
function wr(e) {
    if (e.__P && e.__d) {
        var t = e.__v
        , n = t.__e
        , r = []
        , o = []
        , c = ve({}, t);
        c.__v = t.__v + 1,
        A.vnode && A.vnode(c),
        tn(e.__P, c, t, e.__n, e.__P.namespaceURI, 32 & t.__u ? [n] : null, r, n ?? Oe(t), !!(32 & t.__u), o),
        c.__v = t.__v,
        c.__.__k[c.__i] = c,
        Hn(r, c, o),
        t.__e = t.__ = null,
        c.__e != n && Ln(c)
    }
}
function Ln(e) {
    if ((e = e.__) != null && e.__c != null)
    return e.__e = e.__c.base = null,
    e.__k.some(function(t) {
        if (t != null && t.__e != null)
        return e.__e = e.__c.base = t.__e
    }),
    Ln(e)
}
function dn(e) {
    (!e.__d && (e.__d = !0) && Ce.push(e) && !Tt.__r++ || un != A.debounceRendering) && ((un = A.debounceRendering) || En)(Tt)
}
function Tt() {
    try {
        for (var e, t = 1; Ce.length; )
        Ce.length > t && Ce.sort(Rn),
        e = Ce.shift(),
        t = Ce.length,
        wr(e)
    } finally {
        Ce.length = Tt.__r = 0
    }
}
function Dn(e, t, n, r, o, c, u, _, h, f, y) {
    var a, b, g, L, T, W, B, E = r && r.__k || Pt, ce = t.length;
    for (h = br(n, t, E, h, ce),
    a = 0; a < ce; a++)
    (g = n.__k[a]) != null && (b = g.__i != -1 && E[g.__i] || Mt,
    g.__i = a,
    W = tn(e, g, b, o, c, u, _, h, f, y),
    L = g.__e,
    g.ref && b.ref != g.ref && (b.ref && nn(b.ref, null, g),
    y.push(g.ref, g.__c || L, g)),
    T == null && L != null && (T = L),
    (B = !!(4 & g.__u)) || b.__k === g.__k ? h = Fn(g, h, e, B) : typeof g.type == "function" && W !== void 0 ? h = W : L && (h = L.nextSibling),
    g.__u &= -7);
    return n.__e = T,
    h
}
function br(e, t, n, r, o) {
    var c, u, _, h, f, y = n.length, a = y, b = 0;
    for (e.__k = new Array(o),
    c = 0; c < o; c++)
    (u = t[c]) != null && typeof u != "boolean" && typeof u != "function" ? (typeof u == "string" || typeof u == "number" || typeof u == "bigint" || u.constructor == String ? u = e.__k[c] = Nt(null, u, null, null, null) : Je(u) ? u = e.__k[c] = Nt(xe, {
        children: u
    }, null, null, null) : u.constructor === void 0 && u.__b > 0 ? u = e.__k[c] = Nt(u.type, u.props, u.key, u.ref ? u.ref : null, u.__v) : e.__k[c] = u,
    h = c + b,
    u.__ = e,
    u.__b = e.__b + 1,
    _ = null,
    (f = u.__i = kr(u, n, h, a)) != -1 && (a--,
    (_ = n[f]) && (_.__u |= 2)),
    _ == null || _.__v == null ? (f == -1 && (o > y ? b-- : o < y && b++),
    typeof u.type != "function" && (u.__u |= 4)) : f != h && (f == h - 1 ? b-- : f == h + 1 ? b++ : (f > h ? b-- : b++,
    u.__u |= 4))) : e.__k[c] = null;
    if (a)
    for (c = 0; c < y; c++)
    (_ = n[c]) != null && (2 & _.__u) == 0 && (_.__e == r && (r = Oe(_)),
    On(_, _));
    return r
}
function Fn(e, t, n, r) {
    var o, c;
    if (typeof e.type == "function") {
        for (o = e.__k,
        c = 0; o && c < o.length; c++)
        o[c] && (o[c].__ = e,
        t = Fn(o[c], t, n, r));
        return t
    }
    e.__e != t && (r && (t && e.type && !t.parentNode && (t = Oe(e)),
    n.insertBefore(e.__e, t || null)),
    t = e.__e);
    do
    t = t && t.nextSibling;
    while (t != null && t.nodeType == 8);
    return t
}
function Bt(e, t) {
    return t = t || [],
    e == null || typeof e == "boolean" || (Je(e) ? e.some(function(n) {
        Bt(n, t)
    }) : t.push(e)),
    t
}
function kr(e, t, n, r) {
    var o, c, u, _ = e.key, h = e.type, f = t[n], y = f != null && (2 & f.__u) == 0;
    if (f === null && _ == null || y && _ == f.key && h == f.type)
    return n;
    if (r > (y ? 1 : 0)) {
        for (o = n - 1,
        c = n + 1; o >= 0 || c < t.length; )
        if ((f = t[u = o >= 0 ? o-- : c++]) != null && (2 & f.__u) == 0 && _ == f.key && h == f.type)
        return u
    }
    return -1
}
function _n(e, t, n) {
    t[0] == "-" ? e.setProperty(t, n ?? "") : e[t] = n == null ? "" : typeof n != "number" || xr.test(t) ? n : n + "px"
}
function gt(e, t, n, r, o) {
    var c, u;
    e: if (t == "style")
    if (typeof n == "string")
    e.style.cssText = n;
    else {
        if (typeof r == "string" && (e.style.cssText = r = ""),
        r)
        for (t in r)
        n && t in n || _n(e.style, t, "");
        if (n)
        for (t in n)
        r && n[t] == r[t] || _n(e.style, t, n[t])
    }
    else if (t[0] == "o" && t[1] == "n")
    c = t != (t = t.replace($n, "$1")),
    u = t.toLowerCase(),
    t = u in e || t == "onFocusOut" || t == "onFocusIn" ? u.slice(2) : t.slice(2),
    e.l || (e.l = {}),
    e.l[t + c] = n,
    n ? r ? n.u = r.u : (n.u = Qt,
    e.addEventListener(t, c ? Zt : Kt, c)) : e.removeEventListener(t, c ? Zt : Kt, c);
    else {
        if (o == "http://www.w3.org/2000/svg")
        t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if (t != "width" && t != "height" && t != "href" && t != "list" && t != "form" && t != "tabIndex" && t != "download" && t != "rowSpan" && t != "colSpan" && t != "role" && t != "popover" && t in e)
        try {
            e[t] = n ?? "";
            break e
        } catch {}
        typeof n == "function" || (n == null || n === !1 && t[4] != "-" ? e.removeAttribute(t) : e.setAttribute(t, t == "popover" && n == 1 ? "" : n))
    }
}
function fn(e) {
    return function(t) {
        if (this.l) {
            var n = this.l[t.type + e];
            if (t.t == null)
            t.t = Qt++;
            else if (t.t < n.u)
            return;
            return n(A.event ? A.event(t) : t)
        }
    }
}
function tn(e, t, n, r, o, c, u, _, h, f) {
    var y, a, b, g, L, T, W, B, E, ce, _e, Pe, et, Ee, We, K = t.type;
    if (t.constructor !== void 0)
    return null;
    128 & n.__u && (h = !!(32 & n.__u),
    c = [_ = t.__e = n.__e]),
    (y = A.__b) && y(t);
    e: if (typeof K == "function")
    try {
        if (B = t.props,
        E = K.prototype && K.prototype.render,
        ce = (y = K.contextType) && r[y.__c],
        _e = y ? ce ? ce.props.value : y.__ : r,
        n.__c ? W = (a = t.__c = n.__c).__ = a.__E : (E ? t.__c = a = new K(B,_e) : (t.__c = a = new ye(B,_e),
        a.constructor = K,
        a.render = Cr),
        ce && ce.sub(a),
        a.state || (a.state = {}),
        a.__n = r,
        b = a.__d = !0,
        a.__h = [],
        a._sb = []),
        E && a.__s == null && (a.__s = a.state),
        E && K.getDerivedStateFromProps != null && (a.__s == a.state && (a.__s = ve({}, a.__s)),
        ve(a.__s, K.getDerivedStateFromProps(B, a.__s))),
        g = a.props,
        L = a.state,
        a.__v = t,
        b)
        E && K.getDerivedStateFromProps == null && a.componentWillMount != null && a.componentWillMount(),
        E && a.componentDidMount != null && a.__h.push(a.componentDidMount);
        else {
            if (E && K.getDerivedStateFromProps == null && B !== g && a.componentWillReceiveProps != null && a.componentWillReceiveProps(B, _e),
            t.__v == n.__v || !a.__e && a.shouldComponentUpdate != null && a.shouldComponentUpdate(B, a.__s, _e) === !1) {
                t.__v != n.__v && (a.props = B,
                a.state = a.__s,
                a.__d = !1),
                t.__e = n.__e,
                t.__k = n.__k,
                t.__k.some(function(we) {
                    we && (we.__ = t)
                }),
                Pt.push.apply(a.__h, a._sb),
                a._sb = [],
                a.__h.length && u.push(a);
                break e
            }
            a.componentWillUpdate != null && a.componentWillUpdate(B, a.__s, _e),
            E && a.componentDidUpdate != null && a.__h.push(function() {
                a.componentDidUpdate(g, L, T)
            })
        }
        if (a.context = _e,
        a.props = B,
        a.__P = e,
        a.__e = !1,
        Pe = A.__r,
        et = 0,
        E)
        a.state = a.__s,
        a.__d = !1,
        Pe && Pe(t),
        y = a.render(a.props, a.state, a.context),
        Pt.push.apply(a.__h, a._sb),
        a._sb = [];
        else
        do
        a.__d = !1,
        Pe && Pe(t),
        y = a.render(a.props, a.state, a.context),
        a.state = a.__s;
        while (a.__d && ++et < 25);
        a.state = a.__s,
        a.getChildContext != null && (r = ve(ve({}, r), a.getChildContext())),
        E && !b && a.getSnapshotBeforeUpdate != null && (T = a.getSnapshotBeforeUpdate(g, L)),
        Ee = y != null && y.type === xe && y.key == null ? Un(y.props.children) : y,
        _ = Dn(e, Je(Ee) ? Ee : [Ee], t, n, r, o, c, u, _, h, f),
        a.base = t.__e,
        t.__u &= -161,
        a.__h.length && u.push(a),
        W && (a.__E = a.__ = null)
    } catch (we) {
        if (t.__v = null,
        h || c != null)
        if (we.then) {
            for (t.__u |= h ? 160 : 128; _ && _.nodeType == 8 && _.nextSibling; )
            _ = _.nextSibling;
            c[c.indexOf(_)] = null,
            t.__e = _
        } else {
            for (We = c.length; We--; )
            en(c[We]);
            Gt(t)
        }
        else
        t.__e = n.__e,
        t.__k = n.__k,
        we.then || Gt(t);
        A.__e(we, t, n)
    }
    else
    c == null && t.__v == n.__v ? (t.__k = n.__k,
    t.__e = n.__e) : _ = t.__e = Nr(n.__e, t, n, r, o, c, u, h, f);
    return (y = A.diffed) && y(t),
    128 & t.__u ? void 0 : _
}
function Gt(e) {
    e && (e.__c && (e.__c.__e = !0),
    e.__k && e.__k.some(Gt))
}
function Hn(e, t, n) {
    for (var r = 0; r < n.length; r++)
    nn(n[r], n[++r], n[++r]);
    A.__c && A.__c(t, e),
    e.some(function(o) {
        try {
            e = o.__h,
            o.__h = [],
            e.some(function(c) {
                c.call(o)
            })
        } catch (c) {
            A.__e(c, o.__v)
        }
    })
}
function Un(e) {
    return typeof e != "object" || e == null || e.__b > 0 ? e : Je(e) ? e.map(Un) : ve({}, e)
}
function Nr(e, t, n, r, o, c, u, _, h) {
    var f, y, a, b, g, L, T, W = n.props || Mt, B = t.props, E = t.type;
    if (E == "svg" ? o = "http://www.w3.org/2000/svg" : E == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"),
    c != null) {
        for (f = 0; f < c.length; f++)
        if ((g = c[f]) && "setAttribute"in g == !!E && (E ? g.localName == E : g.nodeType == 3)) {
            e = g,
            c[f] = null;
            break
        }
    }
    if (e == null) {
        if (E == null)
        return document.createTextNode(B);
        e = document.createElementNS(o, E, B.is && B),
        _ && (A.__m && A.__m(t, c),
        _ = !1),
        c = null
    }
    if (E == null)
    W === B || _ && e.data == B || (e.data = B);
    else {
        if (c = c && Et.call(e.childNodes),
        !_ && c != null)
        for (W = {},
        f = 0; f < e.attributes.length; f++)
        W[(g = e.attributes[f]).name] = g.value;
        for (f in W)
        g = W[f],
        f == "dangerouslySetInnerHTML" ? a = g : f == "children" || f in B || f == "value" && "defaultValue"in B || f == "checked" && "defaultChecked"in B || gt(e, f, null, g, o);
        for (f in B)
        g = B[f],
        f == "children" ? b = g : f == "dangerouslySetInnerHTML" ? y = g : f == "value" ? L = g : f == "checked" ? T = g : _ && typeof g != "function" || W[f] === g || gt(e, f, g, W[f], o);
        if (y)
        _ || a && (y.__html == a.__html || y.__html == e.innerHTML) || (e.innerHTML = y.__html),
        t.__k = [];
        else if (a && (e.innerHTML = ""),
        Dn(t.type == "template" ? e.content : e, Je(b) ? b : [b], t, n, r, E == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, c, u, c ? c[0] : n.__k && Oe(n, 0), _, h),
        c != null)
        for (f = c.length; f--; )
        en(c[f]);
        _ || (f = "value",
        E == "progress" && L == null ? e.removeAttribute("value") : L != null && (L !== e[f] || E == "progress" && !L || E == "option" && L != W[f]) && gt(e, f, L, W[f], o),
        f = "checked",
        T != null && T != e[f] && gt(e, f, T, W[f], o))
    }
    return e
}
function nn(e, t, n) {
    try {
        if (typeof e == "function") {
            var r = typeof e.__u == "function";
            r && e.__u(),
            r && t == null || (e.__u = e(t))
        } else
        e.current = t
    } catch (o) {
        A.__e(o, n)
    }
}
function On(e, t, n) {
    var r, o;
    if (A.unmount && A.unmount(e),
    (r = e.ref) && (r.current && r.current != e.__e || nn(r, null, t)),
    (r = e.__c) != null) {
        if (r.componentWillUnmount)
        try {
            r.componentWillUnmount()
        } catch (c) {
            A.__e(c, t)
        }
        r.base = r.__P = null
    }
    if (r = e.__k)
    for (o = 0; o < r.length; o++)
    r[o] && On(r[o], t, n || typeof e.type != "function");
    n || en(e.__e),
    e.__c = e.__ = e.__e = void 0
}
function Cr(e, t, n) {
    return this.constructor(e, n)
}
function Sr(e, t, n) {
    var r, o, c, u;
    t == document && (t = document.documentElement),
    A.__ && A.__(e, t),
    o = (r = !1) ? null : t.__k,
    c = [],
    u = [],
    tn(t, e = t.__k = It(xe, null, [e]), o || Mt, Mt, t.namespaceURI, o ? null : t.firstChild ? Et.call(t.childNodes) : null, c, o ? o.__e : t.firstChild, r, u),
    Hn(c, e, u)
}
Et = Pt.slice,
A = {
    __e: function(e, t, n, r) {
        for (var o, c, u; t = t.__; )
        if ((o = t.__c) && !o.__)
        try {
            if ((c = o.constructor) && c.getDerivedStateFromError != null && (o.setState(c.getDerivedStateFromError(e)),
            u = o.__d),
            o.componentDidCatch != null && (o.componentDidCatch(e, r || {}),
            u = o.__d),
            u)
            return o.__E = o
        } catch (_) {
            e = _
        }
        throw e
    }
},
Bn = 0,
ye.prototype.setState = function(e, t) {
    var n;
    n = this.__s != null && this.__s != this.state ? this.__s : this.__s = ve({}, this.state),
    typeof e == "function" && (e = e(ve({}, n), this.props)),
    e && ve(n, e),
    e != null && this.__v && (t && this._sb.push(t),
    dn(this))
}
,
ye.prototype.forceUpdate = function(e) {
    this.__v && (this.__e = !0,
    e && this.__h.push(e),
    dn(this))
}
,
ye.prototype.render = xe,
Ce = [],
En = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout,
Rn = function(e, t) {
    return e.__v.__b - t.__v.__b
}
,
Tt.__r = 0,
$n = /(PointerCapture)$|Capture$/i,
Qt = 0,
Kt = fn(!1),
Zt = fn(!0);
var Ar = 0;
function d(e, t, n, r, o, c) {
    t || (t = {});
    var u, _, h = t;
    if ("ref"in h)
    for (_ in h = {},
    t)
    _ == "ref" ? u = t[_] : h[_] = t[_];
    var f = {
        type: e,
        props: h,
        key: n,
        ref: u,
        __k: null,
        __: null,
        __b: 0,
        __e: null,
        __c: null,
        constructor: void 0,
        __v: --Ar,
        __i: -1,
        __u: 0,
        __source: o,
        __self: c
    };
    if (typeof e == "function" && (u = e.defaultProps))
    for (_ in u)
    h[_] === void 0 && (h[_] = u[_]);
    return A.vnode && A.vnode(f),
    f
}
const Mr = "/api/v1/auth/refresh";
let Be = null
, zn = null;
function Pr(e) {
    try {
        return JSON.parse(atob(e.split(".")[1])).sub ?? null
    } catch {
        return null
    }
}
function Ir() {
    const e = "device_id";
    let t = localStorage.getItem(e);
    return t || (t = crypto.randomUUID(),
    localStorage.setItem(e, t)),
    t
}
let ge = {
    platform: "web",
    version: "1.0.0",
    deviceId: Ir()
}
, Wt = !1
, Ke = null
, Ct = null
, St = null;
function Tr() {
    return document.cookie.split(";").some(e => e.trim().startsWith("is_auth="))
}
function Wn() {
    return !!(window.AndroidBridge || window.webkit?.messageHandlers?.iosBridge)
}
function Ze(e) {
    Be = e,
    zn = e ? Pr(e) : null,
    window.currentAccessToken = e ?? void 0,
    e && document.dispatchEvent(new CustomEvent("tokenUpdated"))
}
function Br() {
    window.webkit?.messageHandlers?.iosBridge ? window.webkit.messageHandlers.iosBridge.postMessage("onTokenExpired") : window.AndroidBridge && window.AndroidBridge.onTokenExpired()
}
function Er() {
    window.webkit?.messageHandlers?.iosBridge ? window.webkit.messageHandlers.iosBridge.postMessage("requestAuth") : window.AndroidBridge && window.AndroidBridge.requestAuth()
}
function Yn() {
    return St || (St = new Promise(e => {
        Ct = e
    }
    )),
    St
}
async function Xn() {
    try {
        const e = await fetch(Mr, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });
        return e.status === 401 ? (window.location.href = "https://итд.com",
        null) : e.ok ? (await e.json()).accessToken ?? null : null
    } catch {
        return null
    }
}
async function jn() {
    return Wt && Ke || (Wt = !0,
    Ke = (async () => {
        const e = await Xn();
        return e || (Wn() ? (Br(),
        await Yn()) : null)
    }
    )().finally( () => {
        Wt = !1,
        Ke = null
    }
    )),
    Ke
}
function rn() {
    return Be
}
function Rr() {
    return zn
}
async function $r() {
    if (window.setNativeAuth = e => {
        e.token && Ze(e.token),
        ge = {
            platform: e.platform,
            version: e.version,
            deviceId: e.deviceId
        },
        Ct && e.token && (Ct(e.token),
        Ct = null,
        St = null)
    }
    ,
    Tr()) {
        const e = await Xn();
        if (e) {
            Ze(e);
            return
        }
    }
    if (Wn()) {
        Er(),
        await Yn();
        return
    }
}
async function Ae(e, t) {
    const n = new Headers(t?.headers);
    Be && n.set("Authorization", `Bearer ${Be}`),
    n.set("X-Platform", ge.platform),
    n.set("X-App-Version", ge.version),
    ge.deviceId && n.set("X-Device-Id", ge.deviceId);
    let r = await fetch(e, {
        ...t,
        headers: n,
        credentials: "include"
    });
    if (r.status === 401) {
        Ze(null);
        const o = await jn();
        o && (Ze(o),
        n.set("Authorization", `Bearer ${o}`),
        r = await fetch(e, {
            ...t,
            headers: n,
            credentials: "include"
        }))
    }
    return r
}
async function Lr() {
    if (Be)
    return Be;
    const e = await jn();
    return e && Ze(e),
    Be
}
function Dr(e) {
    const t = new URLSearchParams;
    t.set("platform", ge.platform),
    t.set("app_version", ge.version),
    ge.deviceId && t.set("device_id", ge.deviceId);
    const n = t.toString();
    return n ? `${e}?${n}` : e
}
var Ge, Y, Yt, hn, qe = 0, Vn = [], V = A, pn = V.__b, mn = V.__r, vn = V.diffed, gn = V.__c, yn = V.unmount, xn = V.__;
function on(e, t) {
    V.__h && V.__h(Y, e, qe || t),
    qe = 0;
    var n = Y.__H || (Y.__H = {
        __: [],
        __h: []
    });
    return e >= n.__.length && n.__.push({}),
    n.__[e]
}
function z(e) {
    return qe = 1,
    Fr(Gn, e)
}
function Fr(e, t, n) {
    var r = on(Ge++, 2);
    if (r.t = e,
    !r.__c && (r.__ = [n ? n(t) : Gn(void 0, t), function(_) {
        var h = r.__N ? r.__N[0] : r.__[0]
        , f = r.t(h, _);
        h !== f && (r.__N = [f, r.__[1]],
        r.__c.setState({}))
    }
    ],
    r.__c = Y,
    !Y.__f)) {
        var o = function(_, h, f) {
            if (!r.__c.__H)
            return !0;
            var y = r.__c.__H.__.filter(function(b) {
                return b.__c
            });
            if (y.every(function(b) {
                return !b.__N
            }))
            return !c || c.call(this, _, h, f);
            var a = r.__c.props !== _;
            return y.some(function(b) {
                if (b.__N) {
                    var g = b.__[0];
                    b.__ = b.__N,
                    b.__N = void 0,
                    g !== b.__[0] && (a = !0)
                }
            }),
            c && c.call(this, _, h, f) || a
        };
        Y.__f = !0;
        var c = Y.shouldComponentUpdate
        , u = Y.componentWillUpdate;
        Y.componentWillUpdate = function(_, h, f) {
            if (this.__e) {
                var y = c;
                c = void 0,
                o(_, h, f),
                c = y
            }
            u && u.call(this, _, h, f)
        }
        ,
        Y.shouldComponentUpdate = o
    }
    return r.__N || r.__
}
function de(e, t) {
    var n = on(Ge++, 3);
    !V.__s && Zn(n.__H, t) && (n.__ = e,
    n.u = t,
    Y.__H.__h.push(n))
}
function S(e) {
    return qe = 5,
    Kn(function() {
        return {
            current: e
        }
    }, [])
}
function Kn(e, t) {
    var n = on(Ge++, 7);
    return Zn(n.__H, t) && (n.__ = e(),
    n.__H = t,
    n.__h = e),
    n.__
}
function M(e, t) {
    return qe = 8,
    Kn(function() {
        return e
    }, t)
}
function Hr() {
    for (var e; e = Vn.shift(); ) {
        var t = e.__H;
        if (e.__P && t)
        try {
            t.__h.some(At),
            t.__h.some(qt),
            t.__h = []
        } catch (n) {
            t.__h = [],
            V.__e(n, e.__v)
        }
    }
}
V.__b = function(e) {
    Y = null,
    pn && pn(e)
}
,
V.__ = function(e, t) {
    e && t.__k && t.__k.__m && (e.__m = t.__k.__m),
    xn && xn(e, t)
}
,
V.__r = function(e) {
    mn && mn(e),
    Ge = 0;
    var t = (Y = e.__c).__H;
    t && (Yt === Y ? (t.__h = [],
    Y.__h = [],
    t.__.some(function(n) {
        n.__N && (n.__ = n.__N),
        n.u = n.__N = void 0
    })) : (t.__h.some(At),
    t.__h.some(qt),
    t.__h = [],
    Ge = 0)),
    Yt = Y
}
,
V.diffed = function(e) {
    vn && vn(e);
    var t = e.__c;
    t && t.__H && (t.__H.__h.length && (Vn.push(t) !== 1 && hn === V.requestAnimationFrame || ((hn = V.requestAnimationFrame) || Ur)(Hr)),
    t.__H.__.some(function(n) {
        n.u && (n.__H = n.u),
        n.u = void 0
    })),
    Yt = Y = null
}
,
V.__c = function(e, t) {
    t.some(function(n) {
        try {
            n.__h.some(At),
            n.__h = n.__h.filter(function(r) {
                return !r.__ || qt(r)
            })
        } catch (r) {
            t.some(function(o) {
                o.__h && (o.__h = [])
            }),
            t = [],
            V.__e(r, n.__v)
        }
    }),
    gn && gn(e, t)
}
,
V.unmount = function(e) {
    yn && yn(e);
    var t, n = e.__c;
    n && n.__H && (n.__H.__.some(function(r) {
        try {
            At(r)
        } catch (o) {
            t = o
        }
    }),
    n.__H = void 0,
    t && V.__e(t, n.__v))
}
;
var wn = typeof requestAnimationFrame == "function";
function Ur(e) {
    var t, n = function() {
        clearTimeout(r),
        wn && cancelAnimationFrame(t),
        setTimeout(e)
    }, r = setTimeout(n, 35);
    wn && (t = requestAnimationFrame(n))
}
function At(e) {
    var t = Y
    , n = e.__c;
    typeof n == "function" && (e.__c = void 0,
    n()),
    Y = t
}
function qt(e) {
    var t = Y;
    e.__c = e.__(),
    Y = t
}
function Zn(e, t) {
    return !e || e.length !== t.length || t.some(function(n, r) {
        return n !== e[r]
    })
}
function Gn(e, t) {
    return typeof t == "function" ? t(e) : t
}
const Me = "/api"
, Or = window.location.protocol === "https:" ? "wss:" : "ws:"
, zr = `${Or}//${window.location.host}/ws`
, Wr = 1024
, Se = [{
    index: 0,
    hex: "#FFFFFF",
    name: "Белый"
}, {
    index: 1,
    hex: "#E4E4E4",
    name: "Светло-серый"
}, {
    index: 2,
    hex: "#888888",
    name: "Серый"
}, {
    index: 3,
    hex: "#222222",
    name: "Тёмно-серый"
}, {
    index: 4,
    hex: "#000000",
    name: "Чёрный"
}, {
    index: 5,
    hex: "#5A301D",
    name: "Тёмно-коричневый"
}, {
    index: 6,
    hex: "#A06A42",
    name: "Коричневый"
}, {
    index: 7,
    hex: "#FFC48C",
    name: "Телесный"
}, {
    index: 8,
    hex: "#6D001A",
    name: "Бордовый"
}, {
    index: 9,
    hex: "#BE0039",
    name: "Тёмно-красный"
}, {
    index: 10,
    hex: "#E50000",
    name: "Красный"
}, {
    index: 11,
    hex: "#FF3881",
    name: "Ярко-розовый"
}, {
    index: 12,
    hex: "#FFA7D1",
    name: "Светло-розовый"
}, {
    index: 13,
    hex: "#DE107F",
    name: "Маджента"
}, {
    index: 14,
    hex: "#E59500",
    name: "Тёмно-оранжевый"
}, {
    index: 15,
    hex: "#FFA800",
    name: "Оранжевый"
}, {
    index: 16,
    hex: "#E5D900",
    name: "Жёлтый"
}, {
    index: 17,
    hex: "#FFF8B8",
    name: "Светло-жёлтый"
}, {
    index: 18,
    hex: "#005F39",
    name: "Тёмно-зелёный"
}, {
    index: 19,
    hex: "#02BE01",
    name: "Зелёный"
}, {
    index: 20,
    hex: "#94E044",
    name: "Салатовый"
}, {
    index: 21,
    hex: "#00756F",
    name: "Морской"
}, {
    index: 22,
    hex: "#0000EA",
    name: "Тёмно-синий"
}, {
    index: 23,
    hex: "#0083C7",
    name: "Синий"
}, {
    index: 24,
    hex: "#3690EA",
    name: "Светло-синий"
}, {
    index: 25,
    hex: "#00D3DD",
    name: "Бирюзовый"
}, {
    index: 26,
    hex: "#51E9F4",
    name: "Светло-голубой"
}, {
    index: 27,
    hex: "#493AC1",
    name: "Тёмный индиго"
}, {
    index: 28,
    hex: "#6A5CFF",
    name: "Индиго"
}, {
    index: 29,
    hex: "#B44AC0",
    name: "Фиолетовый"
}, {
    index: 30,
    hex: "#811E9F",
    name: "Тёмно-фиолетовый"
}, {
    index: 31,
    hex: "#2B2D42",
    name: "Холодный тёмный"
}]
, Xt = Se.map(e => {
    const t = parseInt(e.hex.slice(1), 16);
    return [t >> 16 & 255, t >> 8 & 255, t & 255]
}
)
, bn = 4
, kn = 3e4
, yt = .1
, xt = 40
, wt = 3
, Yr = 3e3
, Xr = .95
, bt = .01
, jr = .15;
function Vr(e) {
    try {
        const t = e.split(".");
        if (t.length !== 3)
        return null;
        const n = t[1].replace(/-/g, "+").replace(/_/g, "/")
        , r = n + "=".repeat((4 - n.length % 4) % 4);
        return JSON.parse(atob(r))
    } catch {
        return null
    }
}
function Kr() {
    const e = rn();
    if (!e)
    return !1;
    const t = Vr(e);
    if (!t)
    return !1;
    const n = t.roles || (t.role ? [t.role] : []);
    return n.includes("admin") || n.includes("moderator")
}
const Zr = [1, 5, 15, 30, 60];
async function Gr() {
    const e = await Ae(`${Me}/admin/rollback-periods`);
    if (!e.ok)
    throw new Error(`Rollback periods fetch failed: ${e.status}`);
    return (await e.json()).available
}
async function qr(e, t) {
    const n = await Ae(`${Me}/admin/rollback/preview`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            minutesAgo: e,
            zones: t
        })
    });
    if (!n.ok)
    throw new Error(`Preview failed: ${n.status}`);
    return n.json()
}
async function Jr(e, t) {
    const n = await Ae(`${Me}/admin/rollback`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            minutesAgo: e,
            zones: t
        })
    });
    if (!n.ok)
    throw new Error(`Rollback failed: ${n.status}`);
    return n.json()
}
async function Qr(e) {
    const t = await Ae(`${Me}/admin/ban`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: e
        })
    });
    if (!t.ok)
    throw new Error(`Ban failed: ${t.status}`);
    return t.json()
}
async function eo() {
    const e = await Ae(`${Me}/admin/bans`);
    if (!e.ok)
    throw new Error(`Ban list failed: ${e.status}`);
    return (await e.json()).bans
}
async function qn(e) {
    const t = await Ae(`${Me}/admin/unban`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: e
        })
    });
    if (!t.ok)
    throw new Error(`Unban failed: ${t.status}`);
    return t.json()
}
const He = "/"
, to = {
    p1: `${He}assets/events/p/p1.ogg`,
    p2: `${He}assets/events/p/p2.ogg`,
    p3: `${He}assets/events/p/p3.ogg`,
    p4: `${He}assets/events/p/p4.ogg`,
    p5: `${He}assets/events/p/p5.ogg`,
    p6: `${He}assets/events/p/p6.ogg`
}
, Jn = {};
for (const [e,t] of Object.entries(to)) {
    const n = new Audio(t);
    n.preload = "auto",
    Jn[e] = n
}
function Ue(e) {
    const t = Jn[e];
    if (!t)
    return;
    const n = t.cloneNode();
    n.volume = .5,
    n.play().catch( () => {}
    )
}
function no() {
    const e = Math.random() * 100;
    e < 1 ? Ue("p6") : e < 2 ? Ue("p5") : e < 17 ? Ue("p4") : Ue("p3")
}
function ro() {
    const [e,t] = z(!1)
    , [n,r] = z(0)
    , [o,c] = z(bn)
    , [u,_] = z(0)
    , [h,f] = z(kn / 1e3)
    , [y,a] = z({
        x: 0,
        y: 0
    })
    , [b,g] = z(null)
    , [L,T] = z(null)
    , [W,B] = z(!1)
    , [E,ce] = z(!1)
    , [_e,Pe] = z(!1)
    , [et,Ee] = z(!1)
    , [We,K] = z([])
    , [we,rr] = z([])
    , [tt,Ye] = z(null)
    , [or,Ie] = z(null)
    , Rt = S(null)
    , Re = S(null)
    , $e = S(null)
    , Z = S(Wr)
    , nt = S(bn)
    , Te = S(null)
    , rt = S(!1)
    , be = S(null)
    , Xe = S({
        x: -1,
        y: -1
    })
    , ot = S(!1)
    , $t = S({
        x: -1,
        y: -1
    })
    , je = S(null)
    , Le = S(null)
    , fe = S(!1)
    , ct = S(!1)
    , Lt = S(!1)
    , st = S(null)
    , cn = S(kn)
    , Ve = S(!1)
    , ke = S(null)
    , De = S(!1)
    , he = S([])
    , q = S(null)
    , O = S(1)
    , X = S(0)
    , j = S(0)
    , pe = S(!1)
    , se = S(!1)
    , lt = S(0)
    , it = S(0)
    , at = S(0)
    , ut = S(0)
    , dt = S(null)
    , sn = S(1)
    , le = S(0)
    , ie = S(0)
    , te = S(1)
    , _t = S(0)
    , ft = S(0)
    , ae = S(null)
    , Dt = S(0)
    , ne = S([])
    , ue = S(null);
    de( () => {
        be.current = b
    }
        , [b]);
    const P = M( () => {
        const s = Rt.current
        , l = Re.current;
        if (!s || !l)
        return;
        const i = s.getContext("2d", {
            alpha: !1
        });
        if (!i)
        return;
        const v = window.devicePixelRatio || 1
        , m = Z.current
        , k = O.current
        , C = X.current
        , D = j.current;
        if (i.fillStyle = "#1a1a1a",
        i.fillRect(0, 0, s.width, s.height),
        i.save(),
        i.scale(v, v),
        i.imageSmoothingEnabled = !1,
        i.translate(C, D),
        i.scale(k, k),
        i.fillStyle = "#000000",
        i.fillRect(-1, -1, m + 2, m + 2),
        i.drawImage(l, 0, 0),
        Ve.current && ke.current) {
            const x = ke.current
            , N = x.zoneSize;
            for (let R = 0; R < x.gridSize; R++)
            for (let U = 0; U < x.gridSize; U++) {
                const $ = x.grid[R * x.gridSize + U];
                if ($ === 0)
                continue;
                const oe = Math.min($ / 50, 1)
                , J = Math.floor(oe < .5 ? oe * 2 * 255 : 255)
                , Q = Math.floor(oe < .5 ? 255 : (1 - (oe - .5) * 2) * 255)
                , ee = .15 + oe * .35;
                i.fillStyle = `rgba(${J}, ${Q}, 0, ${ee})`,
                i.fillRect(U * N, R * N, N, N)
            }
        }
        const w = he.current;
        if (De.current && w.length > 0) {
            const x = ke.current?.zoneSize ?? 32
            , N = Math.max(2 / k, .08);
            for (const {zx: R, zy: U} of w)
            i.fillStyle = "rgba(255, 70, 0, 0.2)",
            i.fillRect(R * x, U * x, x, x),
            i.strokeStyle = "#ff4500",
            i.lineWidth = N,
            i.strokeRect(R * x, U * x, x, x)
        }
        if (De.current && ot.current) {
            const x = ke.current?.zoneSize ?? 32
            , N = Math.floor(Xe.current.x / x)
            , R = Math.floor(Xe.current.y / x)
            , U = Math.max(2 / k, .08);
            i.strokeStyle = "rgba(255, 255, 255, 0.5)",
            i.lineWidth = U,
            i.setLineDash([Math.max(4 / k, .2), Math.max(4 / k, .2)]),
            i.strokeRect(N * x, R * x, x, x),
            i.setLineDash([])
        }
        const F = je.current;
        if (F) {
            const x = Math.min((performance.now() - F.start) / 200, 1);
            if (x < 1) {
                const N = Xt[F.color];
                if (N) {
                    const R = F.x + .5
                    , U = F.y + .5
                    , $ = 1 + .3 * Math.sin(x * Math.PI)
                    , oe = $ * .5;
                    i.fillStyle = `rgb(${N[0]}, ${N[1]}, ${N[2]})`,
                    i.fillRect(R - oe, U - oe, $, $)
                }
            } else
            je.current = null
        }
        const H = (x, N, R) => {
            if (x < 0 || x >= m || N < 0 || N >= m)
            return;
            if (R === "selected") {
                const vt = Xt[nt.current];
                vt && (i.fillStyle = `rgba(${vt[0]}, ${vt[1]}, ${vt[2]}, 0.5)`,
                i.fillRect(x, N, 1, 1))
            }
            const U = .1
            , $ = .4
            , oe = Math.max(2 / k, .06)
            , J = x + U
            , Q = N + U
            , ee = x + 1 - U
            , re = N + 1 - U;
            i.lineCap = "square",
            i.lineJoin = "miter",
            i.strokeStyle = R === "selected" ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.3)",
            i.lineWidth = oe * 2.5,
            i.beginPath(),
            i.moveTo(J, Q + $),
            i.lineTo(J, Q),
            i.lineTo(J + $, Q),
            i.moveTo(ee - $, Q),
            i.lineTo(ee, Q),
            i.lineTo(ee, Q + $),
            i.moveTo(ee, re - $),
            i.lineTo(ee, re),
            i.lineTo(ee - $, re),
            i.moveTo(J + $, re),
            i.lineTo(J, re),
            i.lineTo(J, re - $),
            i.stroke(),
            i.strokeStyle = R === "selected" ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
            i.lineWidth = oe,
            i.beginPath(),
            i.moveTo(J, Q + $),
            i.lineTo(J, Q),
            i.lineTo(J + $, Q),
            i.moveTo(ee - $, Q),
            i.lineTo(ee, Q),
            i.lineTo(ee, Q + $),
            i.moveTo(ee, re - $),
            i.lineTo(ee, re),
            i.lineTo(ee - $, re),
            i.moveTo(J + $, re),
            i.lineTo(J, re),
            i.lineTo(J, re - $),
            i.stroke()
        }
        , I = be.current;
        if (I && H(I.x, I.y, "selected"),
        ot.current) {
            const x = Xe.current.x
            , N = Xe.current.y;
            (!I || I.x !== x || I.y !== N) && H(x, N, "hover")
        }
        i.restore()
    }
        , []);
    de( () => {
        nt.current = o,
        P()
    }
        , [o, P]);
    const Ft = M( () => {
        const s = Rt.current;
        if (!s)
        return;
        const l = window.devicePixelRatio || 1;
        s.width = window.innerWidth * l,
        s.height = window.innerHeight * l,
        s.style.width = `${window.innerWidth}px`,
        s.style.height = `${window.innerHeight}px`,
        P()
    }
        , [P])
    , Ht = M( () => {
        const s = Z.current
        , l = Math.max(.1, Math.min(window.innerWidth / s, window.innerHeight / s) * .8);
        O.current = l,
        te.current = l,
        X.current = (window.innerWidth - s * l) / 2,
        j.current = (window.innerHeight - s * l) / 2,
        ue.current = null,
        le.current = 0,
        ie.current = 0,
        P()
    }
        , [P])
    , Ne = M( (s, l) => {
        const i = Math.floor((s - X.current) / O.current)
        , v = Math.floor((l - j.current) / O.current);
        return {
            x: i,
            y: v
        }
    }
        , [])
    , G = M( () => {
        if (ae.current)
        return;
        Dt.current = performance.now();
        const s = () => {
            const l = performance.now()
            , i = l - Dt.current;
            if (Dt.current = l,
            i <= 0) {
                ae.current = requestAnimationFrame(s);
                return
            }
            let v = !1;
            const m = le.current
            , k = ie.current;
            if (Math.abs(m) > bt || Math.abs(k) > bt) {
                X.current += m * i,
                j.current += k * i;
                const I = Math.pow(Xr, i / 16.67);
                le.current *= I,
                ie.current *= I,
                Math.abs(le.current) < bt && (le.current = 0),
                Math.abs(ie.current) < bt && (ie.current = 0),
                v = !0
            }
            const C = te.current
            , D = O.current
            , F = Math.abs(Math.log(C / D)) > .001
            , H = 1 - Math.pow(1 - jr, i / 16.67);
            if (ue.current) {
                if (F) {
                    const N = Math.log(D)
                    , R = Math.log(C);
                    O.current = Math.exp(N + (R - N) * H),
                    Math.abs(Math.log(C / O.current)) < .001 && (O.current = C)
                }
                const I = ue.current;
                X.current += (I.x - X.current) * H,
                j.current += (I.y - j.current) * H,
                Math.abs(I.x - X.current) < .5 && Math.abs(I.y - j.current) < .5 && !F ? (X.current = I.x,
                j.current = I.y,
                ue.current = null) : v = !0
            } else if (F) {
                const I = Math.log(D)
                , x = Math.log(C)
                , N = O.current;
                O.current = Math.exp(I + (x - I) * H),
                Math.abs(Math.log(C / O.current)) < .001 && (O.current = C);
                const R = _t.current
                , U = ft.current
                , $ = O.current / N;
                X.current = R - (R - X.current) * $,
                j.current = U - (U - j.current) * $,
                v = !0
            }
            je.current && (v = !0),
            P(),
            v ? ae.current = requestAnimationFrame(s) : ae.current = null
        }
        ;
        ae.current = requestAnimationFrame(s)
    }
        , [P])
    , ht = M( () => {
        le.current = 0,
        ie.current = 0,
        ue.current = null,
        te.current = O.current,
        ae.current && (cancelAnimationFrame(ae.current),
        ae.current = null)
    }
        , [])
    , pt = M(s => {
        rt.current = !0,
        be.current = null,
        g(null);
        let l = Math.ceil(s / 1e3);
        f(l),
        _(l),
        Te.current && clearInterval(Te.current),
        Te.current = setInterval( () => {
            l--,
            l <= 0 ? (Te.current && clearInterval(Te.current),
            rt.current = !1,
            _(0)) : _(l)
        }
            , 1e3)
    }
        , [])
    , Fe = M( (s, l) => {
        const i = Z.current;
        if (!fe.current && rt.current || s < 0 || s >= i || l < 0 || l >= i)
        return;
        const v = $e.current;
        if (!v || v.readyState !== WebSocket.OPEN)
        return;
        const m = nt.current
        , k = new Uint32Array(1);
        k[0] = s << 16 | l << 5 | m,
        v.send(k.buffer),
        no(),
        fe.current || pt(cn.current);
        const C = Re.current?.getContext("2d", {
            alpha: !1
        });
        C && (C.fillStyle = Se[m].hex,
        C.fillRect(s, l, 1, 1));
        const D = Le.current;
        D && (D[s + l * Z.current] = m),
        je.current = {
            x: s,
            y: l,
            start: performance.now(),
            color: m
        },
        G()
    }
        , [pt, G])
    , ln = M(s => {
        if (!fe.current || s.length === 0)
        return;
        const l = $e.current;
        if (!l || l.readyState !== WebSocket.OPEN)
        return;
        const i = Z.current
        , v = nt.current
        , m = s.filter(w => w.x >= 0 && w.x < i && w.y >= 0 && w.y < i);
        if (m.length === 0)
        return;
        const k = new Uint32Array(m.length);
        for (let w = 0; w < m.length; w++)
        k[w] = m[w].x << 16 | m[w].y << 5 | v;
        l.send(k.buffer);
        const C = Re.current?.getContext("2d", {
            alpha: !1
        })
        , D = Le.current;
        for (const w of m)
        C && (C.fillStyle = Se[v].hex,
        C.fillRect(w.x, w.y, 1, 1)),
        D && (D[w.x + w.y * i] = v);
        if (m.length > 0) {
            const w = m[m.length - 1];
            je.current = {
                x: w.x,
                y: w.y,
                start: performance.now(),
                color: v
            },
            G()
        }
    }
        , [G])
    , mt = M(async (s, l, i, v) => {
        const m = Z.current;
        if (s < 0 || s >= m || l < 0 || l >= m)
        return;
        const k = Le.current
        , C = k ? k[s + l * m] : 0
        , D = Se[C]?.hex ?? "#FFFFFF";
        try {
            const w = await Ae(`${Me}/pixel-info?x=${s}&y=${l}`);
            if (!w.ok)
            return;
            const F = await w.json();
            T({
                x: s,
                y: l,
                colorHex: D,
                user: F.user,
                screenX: i,
                screenY: v
            })
        } catch {}
    }
        , [])
    , Ut = M(async () => {
        await Lr();
        const s = new WebSocket(Dr(zr));
        s.binaryType = "arraybuffer",
        $e.current = s,
        s.onopen = () => {
            const l = rn();
            l && s.send(l),
            t(!0)
        }
        ,
        s.onclose = () => {
            t(!1),
            setTimeout(Ut, Yr)
        }
        ,
        s.onmessage = l => {
            const i = l.data
            , v = i.byteLength;
            if (v % 4 !== 0) {
                const w = new DataView(i)
                , F = w.getUint8(0);
                if (F === 1 && v === 5) {
                    fe.current || pt(w.getUint32(1, !0));
                    return
                }
                if (F === 4 && v === 5) {
                    r(w.getUint32(1, !0));
                    return
                }
                if (F === 5 && v === 6) {
                    const H = w.getUint32(1, !0)
                    , I = w.getUint8(5) === 1;
                    cn.current = H,
                    fe.current = I,
                    B(I);
                    return
                }
                if (F === 2 && v >= 3) {
                    const H = w.getUint8(1)
                    , I = w.getUint8(2)
                    , x = H * H;
                    if (v === 3 + x * 2) {
                        const N = new Array(x);
                        let R = 0;
                        for (let U = 0; U < x; U++) {
                            const $ = w.getUint16(3 + U * 2, !0);
                            N[U] = $,
                            $ > R && (R = $)
                        }
                        ke.current = {
                            grid: N,
                            gridSize: H,
                            zoneSize: I,
                            maxValue: R
                        },
                        Ve.current && P()
                    }
                    return
                }
                if (F === 3 && v >= 3) {
                    const H = w.getUint16(1, !0);
                    if (v === 3 + H * 4 && ke.current) {
                        const I = ke.current;
                        for (let N = 0; N < H; N++) {
                            const R = w.getUint16(3 + N * 4, !0)
                            , U = w.getUint16(3 + N * 4 + 2, !0);
                            R < I.grid.length && (I.grid[R] = U)
                        }
                        let x = 0;
                        for (let N = 0; N < I.grid.length; N++)
                        I.grid[N] > x && (x = I.grid[N]);
                        I.maxValue = x,
                        Ve.current && P()
                    }
                    return
                }
                return
            }
            const m = new Uint32Array(i);
            console.log(`Пришло ${m.length} пикселей`);
            const k = Re.current?.getContext("2d", {
                alpha: !1
            });
            if (!k)
            return;
            const C = Le.current
            , D = Z.current;
            for (let w = 0; w < m.length; w++) {
                const F = m[w]
                , H = F & 31
                , I = F >> 5 & 2047
                , x = F >> 16 & 2047;
                C && (C[x + I * D] = H),
                k.fillStyle = Se[H].hex,
                k.fillRect(x, I, 1, 1)
            }
            P()
        }
    }
        , [P, pt])
    , an = M(async () => {
        Ht();
        try {
            const s = await Ae(`${Me}/board`);
            if (!s.ok)
            throw new Error("Сервер не доступен");
            const l = parseInt(s.headers.get("X-Canvas-Size") || "");
            l && l > 0 && (Z.current = l);
            const i = Z.current
            , v = typeof OffscreenCanvas < "u" ? new OffscreenCanvas(i,i) : Object.assign(document.createElement("canvas"), {
                width: i,
                height: i
            });
            Re.current = v;
            const m = v.getContext("2d", {
                alpha: !1
            });
            m.fillStyle = "#FFFFFF",
            m.fillRect(0, 0, i, i),
            Ht();
            const k = await s.arrayBuffer()
            , C = new Uint8Array(k);
            Le.current = C;
            const D = m.createImageData(i, i)
            , w = D.data;
            for (let H = 0; H < C.length; H++) {
                const I = C[H]
                , x = Xt[I];
                if (!x)
                continue;
                const N = H * 4;
                w[N] = x[0],
                w[N + 1] = x[1],
                w[N + 2] = x[2],
                w[N + 3] = 255
            }
            m.putImageData(D, 0, 0),
            P(),
            Ut();
            const F = Kr();
            fe.current = F,
            B(F)
        } catch (s) {
            console.error(s)
        }
    }
        , [Ht, Ut, P])
    , cr = M(s => {
        if (ht(),
        ne.current = [],
        T(null),
        fe.current && Lt.current && !De.current) {
            ct.current = !0;
            const l = Ne(s.clientX, s.clientY)
            , i = Z.current;
            l.x >= 0 && l.x < i && l.y >= 0 && l.y < i && (Fe(l.x, l.y),
            st.current = {
                x: l.x,
                y: l.y
            });
            return
        }
        pe.current = !0,
        se.current = !1,
        lt.current = s.clientX,
        it.current = s.clientY,
        at.current = X.current,
        ut.current = j.current
    }
        , [ht, Ne, Fe])
    , Ot = M(s => {
        const l = Ne(s.clientX, s.clientY)
        , i = Z.current;
        if (Xe.current = l,
        ot.current = l.x >= 0 && l.x < i && l.y >= 0 && l.y < i,
        ot.current && ($t.current.x !== l.x || $t.current.y !== l.y) && ($t.current = l,
        a(l)),
        ct.current && fe.current) {
            if (l.x >= 0 && l.x < i && l.y >= 0 && l.y < i) {
                const v = st.current;
                if (v && (v.x !== l.x || v.y !== l.y)) {
                    const m = [];
                    let k = v.x
                    , C = v.y;
                    const D = l.x
                    , w = l.y
                    , F = Math.abs(D - k)
                    , H = Math.abs(w - C)
                    , I = k < D ? 1 : -1
                    , x = C < w ? 1 : -1;
                    let N = F - H;
                    for (; m.push({
                        x: k,
                        y: C
                    }),
                    !(k === D && C === w); ) {
                        const R = 2 * N;
                        R > -H && (N -= H,
                        k += I),
                        R < F && (N += F,
                        C += x)
                    }
                    m.length > 0 && ln(m)
                }
                st.current = {
                    x: l.x,
                    y: l.y
                }
            }
            P();
            return
        }
        if (pe.current) {
            const v = performance.now();
            ne.current.push({
                x: s.clientX,
                y: s.clientY,
                t: v
            }),
            ne.current.length > 5 && ne.current.shift();
            const m = s.clientX - lt.current
            , k = s.clientY - it.current;
            (Math.abs(m) > wt || Math.abs(k) > wt) && (se.current = !0),
            se.current && (X.current = at.current + m,
            j.current = ut.current + k)
        }
        P()
    }
        , [Ne, P, ln])
    , zt = M(s => {
        if (ct.current) {
            ct.current = !1,
            st.current = null;
            return
        }
        if (pe.current) {
            if (pe.current = !1,
            se.current) {
                if (se.current) {
                    const l = ne.current;
                    if (l.length >= 2) {
                        const i = l[l.length - 1]
                        , v = l[Math.max(0, l.length - 3)]
                        , m = i.t - v.t;
                        m > 0 && m < 300 && (le.current = (i.x - v.x) / m,
                        ie.current = (i.y - v.y) / m,
                        G())
                    }
                }
            } else {
                const l = Ne(s.clientX, s.clientY)
                , i = Z.current;
                if (De.current && l.x >= 0 && l.x < i && l.y >= 0 && l.y < i) {
                    const v = ke.current?.zoneSize ?? 32
                    , m = Math.floor(l.x / v)
                    , k = Math.floor(l.y / v)
                    , C = he.current
                    , D = C.findIndex(w => w.zx === m && w.zy === k);
                    D >= 0 ? C.splice(D, 1) : C.push({
                        zx: m,
                        zy: k
                    }),
                    K([...C]),
                    P();
                    return
                }
                l.x >= 0 && l.x < i && l.y >= 0 && l.y < i && (Ue("p1"),
                be.current = {
                    x: l.x,
                    y: l.y
                },
                g({
                    x: l.x,
                    y: l.y
                }),
                mt(l.x, l.y, s.clientX, s.clientY),
                P())
            }
            ne.current = []
        }
    }
        , [Ne, Fe, mt, G])
    , sr = M(s => {
        if (s.preventDefault(),
        s.ctrlKey || s.metaKey) {
            ue.current = null;
            const l = s.ctrlKey && !s.metaKey && Math.abs(s.deltaY) < 50
            , i = l ? .02 : .003
            , v = -s.deltaY * i;
            if (l) {
                let m = O.current * Math.exp(v);
                m = Math.max(yt, Math.min(m, xt));
                const k = s.clientX
                , C = s.clientY;
                X.current = k - (k - X.current) * (m / O.current),
                j.current = C - (C - j.current) * (m / O.current),
                O.current = m,
                te.current = m,
                P()
            } else {
                let m = te.current * Math.exp(v);
                m = Math.max(yt, Math.min(m, xt)),
                te.current = m,
                _t.current = s.clientX,
                ft.current = s.clientY,
                G()
            }
        } else
        X.current -= s.deltaX,
        j.current -= s.deltaY,
        P()
    }
        , [P, G])
    , lr = M(s => {
        s.touches.length === 1 ? (ht(),
        ne.current = [],
        T(null),
        pe.current = !0,
        se.current = !1,
        lt.current = s.touches[0].clientX,
        it.current = s.touches[0].clientY,
        at.current = X.current,
        ut.current = j.current) : s.touches.length === 2 && (pe.current = !1,
        dt.current = Math.hypot(s.touches[0].clientX - s.touches[1].clientX, s.touches[0].clientY - s.touches[1].clientY),
        sn.current = O.current)
    }
        , [ht])
    , ir = M(s => {
        if (s.preventDefault(),
        s.touches.length === 1 && pe.current) {
            const l = performance.now();
            ne.current.push({
                x: s.touches[0].clientX,
                y: s.touches[0].clientY,
                t: l
            }),
            ne.current.length > 5 && ne.current.shift();
            const i = s.touches[0].clientX - lt.current
            , v = s.touches[0].clientY - it.current;
            (Math.abs(i) > wt || Math.abs(v) > wt) && (se.current = !0),
            se.current && (X.current = at.current + i,
            j.current = ut.current + v,
            P())
        } else if (s.touches.length === 2 && dt.current) {
            const l = Math.hypot(s.touches[0].clientX - s.touches[1].clientX, s.touches[0].clientY - s.touches[1].clientY)
            , i = (s.touches[0].clientX + s.touches[1].clientX) / 2
            , v = (s.touches[0].clientY + s.touches[1].clientY) / 2
            , m = l / dt.current
            , k = Math.max(yt, Math.min(sn.current * m, xt));
            X.current = i - (i - X.current) * (k / O.current),
            j.current = v - (v - j.current) * (k / O.current),
            O.current = k,
            te.current = k,
            P()
        }
    }
        , [P])
    , ar = M(s => {
        if (pe.current) {
            if (!se.current && s.changedTouches.length === 1) {
                const l = s.changedTouches[0]
                , i = Ne(l.clientX, l.clientY)
                , v = Z.current;
                i.x >= 0 && i.x < v && i.y >= 0 && i.y < v && (be.current = {
                    x: i.x,
                    y: i.y
                },
                g({
                    x: i.x,
                    y: i.y
                }),
                mt(i.x, i.y, l.clientX, l.clientY),
                P())
            } else if (se.current) {
                const l = ne.current;
                if (l.length >= 2) {
                    const i = l[l.length - 1]
                    , v = l[Math.max(0, l.length - 3)]
                    , m = i.t - v.t;
                    m > 0 && m < 300 && (le.current = (i.x - v.x) / m,
                    ie.current = (i.y - v.y) / m,
                    G())
                }
            }
        }
        pe.current = !1,
        ne.current = [],
        s.touches.length < 2 && (dt.current = null)
    }
        , [Ne, Fe, mt, G])
    , ur = M(s => {}
        , [])
    , dr = M( () => {
        const s = be.current;
        !s || !fe.current && rt.current || Fe(s.x, s.y)
    }
        , [Fe]);
    de( () => {
        Ft(),
        an();
        const s = () => Ft();
        return window.addEventListener("resize", s),
        () => {
            window.removeEventListener("resize", s),
            $e.current && $e.current.close(),
            Te.current && clearInterval(Te.current),
            ae.current && cancelAnimationFrame(ae.current)
        }
    }
        , [an, Ft]),
    de( () => (window.addEventListener("mousemove", Ot),
    window.addEventListener("mouseup", zt),
    () => {
        window.removeEventListener("mousemove", Ot),
        window.removeEventListener("mouseup", zt)
    }
    ), [Ot, zt]),
    de( () => {
        const s = l => {
            if (l.key === "Escape") {
                l.preventDefault(),
                be.current = null,
                g(null),
                T(null),
                P();
                return
            }
            if (l.metaKey || l.ctrlKey) {
                if (l.key === "0") {
                    l.preventDefault(),
                    le.current = 0,
                    ie.current = 0;
                    const v = Z.current
                    , m = Math.max(.1, Math.min(window.innerWidth / v, window.innerHeight / v) * .8);
                    te.current = m,
                    ue.current = {
                        x: (window.innerWidth - v * m) / 2,
                        y: (window.innerHeight - v * m) / 2
                    },
                    G()
                }
                if ((l.key === "=" || l.key === "+") && (l.preventDefault(),
                ue.current = null,
                te.current = Math.min(te.current * 1.25, xt),
                _t.current = window.innerWidth / 2,
                ft.current = window.innerHeight / 2,
                G()),
                l.key === "-" && (l.preventDefault(),
                ue.current = null,
                te.current = Math.max(te.current / 1.25, yt),
                _t.current = window.innerWidth / 2,
                ft.current = window.innerHeight / 2,
                G()),
                l.key === "1") {
                    l.preventDefault(),
                    le.current = 0,
                    ie.current = 0;
                    const v = window.innerWidth / 2
                    , m = window.innerHeight / 2
                    , k = (v - X.current) / O.current
                    , C = (m - j.current) / O.current;
                    te.current = 1,
                    ue.current = {
                        x: v - k,
                        y: m - C
                    },
                    G()
                }
            }
        }
        ;
        return window.addEventListener("keydown", s),
        () => window.removeEventListener("keydown", s)
    }
        , [P, G]);
    const _r = M( () => {
        const s = !Lt.current;
        Lt.current = s,
        ce(s)
    }
        , [])
    , fr = M( () => {
        const s = !Ve.current;
        Ve.current = s,
        Pe(s);
        const l = $e.current;
        l && l.readyState === WebSocket.OPEN && l.send(new Uint8Array([6])),
        P()
    }
        , [P])
    , me = M(s => {
        const l = Re.current?.getContext("2d", {
            alpha: !1
        });
        if (!l)
        return;
        const i = Le.current
        , v = Z.current;
        for (const m of s) {
            const k = m & 31
            , C = m >> 5 & 2047
            , D = m >> 16 & 2047;
            l.fillStyle = Se[k].hex,
            l.fillRect(D, C, 1, 1),
            i && (i[D + C * v] = k)
        }
        P()
    }
        , [P])
    , hr = M( () => {
        const s = q.current;
        s && s.currentPixels.length > 0 && me(s.currentPixels),
        q.current = null,
        Ie(null),
        Ye(null)
    }
        , [me])
    , pr = M( () => {
        const s = !De.current;
        De.current = s,
        Ee(s),
        s || (q.current && (me(q.current.currentPixels),
        q.current = null),
        he.current = [],
        K([]),
        Ie(null),
        Ye(null)),
        P()
    }
        , [P, me])
    , mr = M( () => {
        q.current && (me(q.current.currentPixels),
        q.current = null),
        he.current = [],
        K([]),
        Ie(null),
        Ye(null),
        P()
    }
        , [P, me])
    , vr = M(async () => {
        try {
            const s = await Gr();
            rr(s)
        } catch (s) {
            console.error("Available ages fetch error:", s)
        }
    }
        , [])
    , gr = M(async s => {
        if (he.current.length !== 0) {
            q.current && (me(q.current.currentPixels),
            q.current = null),
            Ye(s),
            Ie(null);
            try {
                const l = await qr(s, he.current);
                q.current = l,
                Ie(l),
                l.previewPixels.length > 0 && me(l.previewPixels)
            } catch (l) {
                console.error("Rollback preview error:", l),
                q.current = null,
                Ie(null)
            }
        }
    }
        , [me])
    , yr = M(async () => {
        if (!(tt === null || he.current.length === 0))
        try {
            await Jr(tt, he.current),
            q.current = null,
            Ie(null),
            Ye(null),
            he.current = [],
            K([])
        } catch (s) {
            console.error("Rollback error:", s)
        }
    }
        , [tt]);
    return {
        canvasRef: Rt,
        state: {
            isConnected: e,
            onlineCount: n,
            selectedColorId: o,
            cooldownLeft: u,
            cooldownTotalSeconds: h,
            coords: y,
            selectedPixel: b,
            pixelInfo: L
        },
        setSelectedColorId: M(s => {
            Ue("p2"),
            c(s)
        }
            , []),
        placeSelectedPixel: dr,
        deselectPixel: M( () => {
            be.current = null,
            g(null),
            T(null),
            P()
        }
            , [P]),
        closePixelInfo: M( () => T(null), []),
        handlers: {
            handleMouseDown: cr,
            handleDoubleClick: ur,
            handleWheel: sr,
            handleTouchStart: lr,
            handleTouchMove: ir,
            handleTouchEnd: ar
        },
        moderation: {
            isModAdmin: W,
            paintMode: E,
            heatmapEnabled: _e,
            zoneSelectActive: et,
            hasSelectedZones: We.length > 0,
            availableAges: we,
            selectedMinutesAgo: tt,
            rollbackPreview: or,
            togglePaintMode: _r,
            toggleHeatmap: fr,
            toggleZoneSelect: pr,
            clearSelection: mr,
            selectMinutesAgo: gr,
            loadAvailableAges: vr,
            cancelPreview: hr,
            executeRollback: yr
        }
    }
}
function oo(e, t) {
    for (var n in t)
    e[n] = t[n];
    return e
}
function Jt(e, t) {
    for (var n in e)
    if (n !== "__source" && !(n in t))
    return !0;
    for (var r in t)
    if (r !== "__source" && e[r] !== t[r])
    return !0;
    return !1
}
function Nn(e, t) {
    this.props = e,
    this.context = t
}
function ze(e, t) {
    function n(o) {
        var c = this.props.ref;
        return c != o.ref && c && (typeof c == "function" ? c(null) : c.current = null),
        t ? !t(this.props, o) || c != o.ref : Jt(this.props, o)
    }
    function r(o) {
        return this.shouldComponentUpdate = n,
        It(e, o)
    }
    return r.displayName = "Memo(" + (e.displayName || e.name) + ")",
    r.__f = r.prototype.isReactComponent = !0,
    r.type = e,
    r
}
(Nn.prototype = new ye).isPureReactComponent = !0,
Nn.prototype.shouldComponentUpdate = function(e, t) {
    return Jt(this.props, e) || Jt(this.state, t)
}
;
var Cn = A.__b;
A.__b = function(e) {
    e.type && e.type.__f && e.ref && (e.props.ref = e.ref,
    e.ref = null),
    Cn && Cn(e)
}
;
var co = A.__e;
A.__e = function(e, t, n, r) {
    if (e.then) {
        for (var o, c = t; c = c.__; )
        if ((o = c.__c) && o.__c)
        return t.__e == null && (t.__e = n.__e,
        t.__k = n.__k),
        o.__c(e, t)
    }
    co(e, t, n, r)
}
;
var Sn = A.unmount;
function Qn(e, t, n) {
    return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach(function(r) {
        typeof r.__c == "function" && r.__c()
    }),
    e.__c.__H = null),
    (e = oo({}, e)).__c != null && (e.__c.__P === n && (e.__c.__P = t),
    e.__c.__e = !0,
    e.__c = null),
    e.__k = e.__k && e.__k.map(function(r) {
        return Qn(r, t, n)
    })),
    e
}
function er(e, t, n) {
    return e && n && (e.__v = null,
    e.__k = e.__k && e.__k.map(function(r) {
        return er(r, t, n)
    }),
    e.__c && e.__c.__P === t && (e.__e && n.appendChild(e.__e),
    e.__c.__e = !0,
    e.__c.__P = n)),
    e
}
function jt() {
    this.__u = 0,
    this.o = null,
    this.__b = null
}
function tr(e) {
    var t = e.__ && e.__.__c;
    return t && t.__a && t.__a(e)
}
function kt() {
    this.i = null,
    this.l = null
}
A.unmount = function(e) {
    var t = e.__c;
    t && (t.__z = !0),
    t && t.__R && t.__R(),
    t && 32 & e.__u && (e.type = null),
    Sn && Sn(e)
}
,
(jt.prototype = new ye).__c = function(e, t) {
    var n = t.__c
    , r = this;
    r.o == null && (r.o = []),
    r.o.push(n);
    var o = tr(r.__v)
    , c = !1
    , u = function() {
        c || r.__z || (c = !0,
        n.__R = null,
        o ? o(h) : h())
    };
    n.__R = u;
    var _ = n.__P;
    n.__P = null;
    var h = function() {
        if (!--r.__u) {
            if (r.state.__a) {
                var f = r.state.__a;
                r.__v.__k[0] = er(f, f.__c.__P, f.__c.__O)
            }
            var y;
            for (r.setState({
                __a: r.__b = null
            }); y = r.o.pop(); )
            y.__P = _,
            y.forceUpdate()
        }
    };
    r.__u++ || 32 & t.__u || r.setState({
        __a: r.__b = r.__v.__k[0]
    }),
    e.then(u, u)
}
,
jt.prototype.componentWillUnmount = function() {
    this.o = []
}
,
jt.prototype.render = function(e, t) {
    if (this.__b) {
        if (this.__v.__k) {
            var n = document.createElement("div")
            , r = this.__v.__k[0].__c;
            this.__v.__k[0] = Qn(this.__b, n, r.__O = r.__P)
        }
        this.__b = null
    }
    var o = t.__a && It(xe, null, e.fallback);
    return o && (o.__u &= -33),
    [It(xe, null, t.__a ? null : e.children), o]
}
;
var An = function(e, t, n) {
    if (++n[1] === n[0] && e.l.delete(t),
    e.props.revealOrder && (e.props.revealOrder[0] !== "t" || !e.l.size))
    for (n = e.i; n; ) {
        for (; n.length > 3; )
        n.pop()();
        if (n[1] < n[0])
        break;
        e.i = n = n[2]
    }
};
(kt.prototype = new ye).__a = function(e) {
    var t = this
    , n = tr(t.__v)
    , r = t.l.get(e);
    return r[0]++,
    function(o) {
        var c = function() {
            t.props.revealOrder ? (r.push(o),
            An(t, e, r)) : o()
        };
        n ? n(c) : c()
    }
}
,
kt.prototype.render = function(e) {
    this.i = null,
    this.l = new Map;
    var t = Bt(e.children);
    e.revealOrder && e.revealOrder[0] === "b" && t.reverse();
    for (var n = t.length; n--; )
    this.l.set(t[n], this.i = [1, 0, this.i]);
    return e.children
}
,
kt.prototype.componentDidUpdate = kt.prototype.componentDidMount = function() {
    var e = this;
    this.l.forEach(function(t, n) {
        An(e, n, t)
    })
}
;
var so = typeof Symbol < "u" && Symbol.for && Symbol.for("react.element") || 60103
, lo = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/
, io = /^on(Ani|Tra|Tou|BeforeInp|Compo)/
, ao = /[A-Z0-9]/g
, uo = typeof document < "u"
, _o = function(e) {
    return (typeof Symbol < "u" && typeof Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(e)
};
ye.prototype.isReactComponent = !0,
["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e) {
    Object.defineProperty(ye.prototype, e, {
        configurable: !0,
        get: function() {
            return this["UNSAFE_" + e]
        },
        set: function(t) {
            Object.defineProperty(this, e, {
                configurable: !0,
                writable: !0,
                value: t
            })
        }
    })
});
var Mn = A.event;
A.event = function(e) {
    return Mn && (e = Mn(e)),
    e.persist = function() {}
    ,
    e.isPropagationStopped = function() {
        return this.cancelBubble
    }
    ,
    e.isDefaultPrevented = function() {
        return this.defaultPrevented
    }
    ,
    e.nativeEvent = e
}
;
var fo = {
    configurable: !0,
    get: function() {
        return this.class
    }
}
, Pn = A.vnode;
A.vnode = function(e) {
    typeof e.type == "string" && (function(t) {
        var n = t.props
        , r = t.type
        , o = {}
        , c = r.indexOf("-") == -1;
        for (var u in n) {
            var _ = n[u];
            if (!(u === "value" && "defaultValue"in n && _ == null || uo && u === "children" && r === "noscript" || u === "class" || u === "className")) {
                var h = u.toLowerCase();
                u === "defaultValue" && "value"in n && n.value == null ? u = "value" : u === "download" && _ === !0 ? _ = "" : h === "translate" && _ === "no" ? _ = !1 : h[0] === "o" && h[1] === "n" ? h === "ondoubleclick" ? u = "ondblclick" : h !== "onchange" || r !== "input" && r !== "textarea" || _o(n.type) ? h === "onfocus" ? u = "onfocusin" : h === "onblur" ? u = "onfocusout" : io.test(u) && (u = h) : h = u = "oninput" : c && lo.test(u) ? u = u.replace(ao, "-$&").toLowerCase() : _ === null && (_ = void 0),
                h === "oninput" && o[u = h] && (u = "oninputCapture"),
                o[u] = _
            }
        }
        r == "select" && (o.multiple && Array.isArray(o.value) && (o.value = Bt(n.children).forEach(function(f) {
            f.props.selected = o.value.indexOf(f.props.value) != -1
        })),
        o.defaultValue != null && (o.value = Bt(n.children).forEach(function(f) {
            f.props.selected = o.multiple ? o.defaultValue.indexOf(f.props.value) != -1 : o.defaultValue == f.props.value
        }))),
        n.class && !n.className ? (o.class = n.class,
        Object.defineProperty(o, "className", fo)) : n.className && (o.class = o.className = n.className),
        t.props = o
    }
    )(e),
    e.$$typeof = so,
    Pn && Pn(e)
}
;
var In = A.__r;
A.__r = function(e) {
    In && In(e),
    e.__c
}
;
var Tn = A.diffed;
A.diffed = function(e) {
    Tn && Tn(e);
    var t = e.props
    , n = e.__e;
    n != null && e.type === "textarea" && "value"in t && t.value !== n.value && (n.value = t.value == null ? "" : t.value)
}
;
const ho = "nUr4Bihl"
, po = "_6v8P-A3V"
, mo = "_0cFxIWzS"
, vo = "ozKF-yUb"
, go = "ms1ZA4rl"
, yo = "DVuiN2Yd"
, xo = "BuUdOCl7"
, wo = "A-KGqsPW"
, bo = "NlBtQwWP"
, ko = "_0PovKnBn"
, No = "gp-l6bMS"
, Co = "Ucl8QbBG"
, So = "na81E8Rc"
, Ao = "allmmozZ"
, Mo = "TBkiteht"
, Po = "_0KGR8cRl"
, Io = "u7oMCUsP"
, To = "bUSeDsPs"
, Bo = "UnF3CfUN"
, Eo = "OWtRuGkW"
, Ro = "m5tH6juu"
, $o = "NPalHZl9"
, Lo = "L8J15IA3"
, Do = "c1KQrGUi"
, Fo = "_0DYDGUU9"
, Ho = "XcrOR1Xb"
, Uo = "JNc43FDy"
, Oo = "EWuV03CP"
, zo = "Qx56e9pm"
, Wo = "B-F-6YxW"
, Yo = "p90pvzUz"
, Xo = "sSMqNNrF"
, jo = "GxKqawad"
, Vo = "FlkH0XGi"
, Ko = "oOzmh-l8"
, Zo = "dpdTpEF-"
, Go = "pE8n1IH3"
, qo = "_0D90GNtr"
, Jo = "Y4pjHZWd"
, Qo = "_7RQa2uWo"
, ec = "_5FvEwjQL"
, tc = "x9JykBC6"
, nc = "sCOZ7zZv"
, rc = "tij1dkLD"
, oc = "_6NKU9xyD"
, cc = "_3D5cuJ-e"
, sc = "DEEhwZ8X"
, lc = "QbSLbYua"
, ic = "zcexvHKa"
, ac = "nuKBjGge"
, uc = "_3SWPTKtn"
, dc = "g8Nus6bx"
, _c = "Qz7CY5Nb"
, fc = "I9vKyng3"
, hc = "whu6OMgA"
, pc = "pJY9g87Z"
, mc = "lTqzGJ5G"
, vc = "OJas4ES2"
, gc = "-PD8OWMw"
, yc = "yaMbR-JJ"
, xc = "BneejzPO"
, wc = "_9j7AZOcU"
, bc = "yCb1S-NX"
, p = {
    pixelBattle: ho,
    canvas: po,
    uiLayer: mo,
    topLeft: vo,
    brandingBar: go,
    brandingDivider: yo,
    onlineBadge: xo,
    onlineDot: wo,
    connected: bo,
    bottomCenter: ko,
    coordsBox: No,
    rightPanel: Co,
    sheetHandle: So,
    panelContent: Ao,
    colorSection: Mo,
    colorName: Po,
    paletteContainer: Io,
    paletteGrid: To,
    colorBtn: Bo,
    active: Eo,
    placeBtn: Ro,
    cooldown: $o,
    placeBtnText: Lo,
    placeBtnProgress: Do,
    pixelInfoPopup: Fo,
    pixelInfoClose: Ho,
    pixelInfoHeader: Uo,
    pixelInfoColor: Oo,
    pixelInfoCoords: zo,
    pixelInfoUser: Wo,
    pixelInfoAvatar: Yo,
    pixelInfoName: Xo,
    pixelInfoEmpty: jo,
    bannedBadge: Vo,
    banBtn: Ko,
    unbanBtn: Zo,
    modToolbar: Go,
    modLabel: qo,
    modBtn: Jo,
    modBtnActive: Qo,
    modBtnDanger: ec,
    modDivider: tc,
    modInfo: nc,
    banListOverlay: rc,
    banListModal: oc,
    banListHeader: cc,
    banListTitle: sc,
    banListItems: lc,
    banListItem: ic,
    banListAvatar: ac,
    banListInfo: uc,
    banListName: dc,
    banListEmpty: _c,
    rulesOverlay: fc,
    rulesModal: hc,
    rulesTitle: pc,
    rulesIntro: mc,
    rulesList: vc,
    rulesItem: gc,
    rulesNumber: yc,
    rulesFooter: xc,
    rulesAcceptBtn: wc,
    visible: bc
}
, kc = () => d("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "40",
    height: "24",
    fill: "none",
    children: [d("path", {
        fill: "#fff",
        d: "M13.5 7.429V4H27v3.429h-4.5V20H18V7.429zM10.125 4l-6.75 10.286V4H0v16h3.375l6.75-10.286V20H13.5V4z"
    }), d("path", {
        fill: "#fff",
        fillRule: "evenodd",
        d: "M37.733 16.222H40V24h-3.4v-4.444H26.4V24H23v-7.778c3.4 0 3.4-4.444 3.4-12.222h11.333zM29.8 7.333v8.89h4.533v-8.89z",
        clipRule: "evenodd"
    })]
})
, Nc = () => d("img", {
    src: "/logo_pb.png",
    alt: "PixelBattle",
    height: "22"
});
function Cc(e) {
    return e < 1e3 ? String(e) : e < 1e4 ? `${(e / 1e3).toFixed(1)}K`.replace(".0K", "K") : e < 1e6 ? `${Math.round(e / 1e3)}K` : `${(e / 1e6).toFixed(1)}M`.replace(".0M", "M")
}
const Sc = ze( ({isConnected: e, onlineCount: t}) => d("div", {
    className: p.topLeft,
    children: [d("div", {
        className: p.brandingBar,
        children: [d("a", {
            href: "https://xn--d1ah4a.com",
            target: "_blank",
            rel: "noopener noreferrer",
            children: d(kc, {})
        }), d("div", {
            className: p.brandingDivider
        }), d(Nc, {})]
    }), d("div", {
        className: p.onlineBadge,
        children: [d("span", {
            className: `${p.onlineDot} ${e ? p.connected : ""}`
        }), d("span", {
            children: e ? `${Cc(t)} онлайн` : "Подключение..."
        })]
    })]
}))
, Ac = ze( ({coords: e}) => d("div", {
    className: p.bottomCenter,
    children: d("div", {
        className: p.coordsBox,
        children: [e.x, ", ", e.y]
    })
}))
, Mc = ze( ({selectedColorId: e, cooldownLeft: t, cooldownTotalSeconds: n, hasSelectedPixel: r, isModAdmin: o, onSelectColor: c, onPlace: u, onClose: _}) => {
    const h = Se.find(T => T.index === e)
    , f = !o && t > 0
    , y = r && !f
    , a = f && n > 0 ? (n - t) / n * 100 : 0
    , b = S(0)
    , g = M(T => {
        b.current = T.touches[0].clientY
    }
        , [])
    , L = M(T => {
        T.changedTouches[0].clientY - b.current > 60 && _()
    }
        , [_]);
    return d("div", {
        className: `${p.rightPanel} ${r ? p.visible : ""}`,
        onTouchStart: g,
        onTouchEnd: L,
        children: [d("div", {
            className: p.sheetHandle
        }), d("div", {
            className: p.panelContent,
            children: [d("div", {
                className: p.colorSection,
                children: [d("div", {
                    className: p.colorName,
                    children: h?.name ?? "Чёрный"
                }), d("div", {
                    className: p.paletteContainer,
                    children: d("div", {
                        className: p.paletteGrid,
                        children: Se.map(T => d("div", {
                            className: `${p.colorBtn} ${T.index === e ? p.active : ""}`,
                            style: {
                                backgroundColor: T.hex
                            },
                            onClick: () => c(T.index)
                        }, T.index))
                    })
                })]
            }), d("button", {
                className: `${p.placeBtn} ${f ? p.cooldown : ""} ${!y && !f ? p.cooldown : ""}`,
                disabled: !y,
                onClick: u,
                children: [f && d("div", {
                    className: p.placeBtnProgress,
                    style: {
                        width: `${a}%`
                    }
                }), d("span", {
                    className: p.placeBtnText,
                    children: f ? `ОЖИДАНИЕ ${t}С` : "ПОСТАВИТЬ"
                })]
            })]
        })]
    })
}
)
, Pc = ze( ({info: e, isModAdmin: t, currentUserId: n, onClose: r, onBanChange: o}) => {
    const c = S(null)
    , [u,_] = z(!1)
    , [h,f] = z(e.user?.isBanned ?? !1);
    de( () => {
        f(e.user?.isBanned ?? !1)
    }
        , [e.user?.isBanned]),
    de( () => {
        const a = c.current;
        if (!a)
        return;
        const b = a.getBoundingClientRect()
        , g = 16;
        let L = e.screenX + 12
        , T = e.screenY - b.height / 2;
        L + b.width + g > window.innerWidth && (L = e.screenX - b.width - 12),
        T < g && (T = g),
        T + b.height + g > window.innerHeight && (T = window.innerHeight - b.height - g),
        a.style.left = `${L}px`,
        a.style.top = `${T}px`,
        a.style.opacity = "1"
    }
        , [e.screenX, e.screenY]);
    const y = M(async () => {
        if (!(!e.user || u)) {
            _(!0);
            try {
                h ? (await qn(e.user.userId),
                f(!1),
                o?.(e.user.userId, !1)) : (await Qr(e.user.userId),
                f(!0),
                o?.(e.user.userId, !0))
            } catch (a) {
                console.error("Ban/unban failed:", a)
            } finally {
                _(!1)
            }
        }
    }
        , [e.user, h, u, o]);
    return d("div", {
        ref: c,
        className: p.pixelInfoPopup,
        onClick: a => a.stopPropagation(),
        children: [d("button", {
            className: p.pixelInfoClose,
            onClick: r,
            children: "×"
        }), d("div", {
            className: p.pixelInfoHeader,
            children: [d("div", {
                className: p.pixelInfoColor,
                style: {
                    backgroundColor: e.colorHex
                }
            }), d("span", {
                className: p.pixelInfoCoords,
                children: ["(", e.x, ", ", e.y, ")"]
            })]
        }), e.user ? d(xe, {
            children: [d("a", {
                className: p.pixelInfoUser,
                href: `https://xn--d1ah4a.com/@${e.user.username}`,
                target: "_blank",
                rel: "noopener noreferrer",
                onClick: a => a.stopPropagation(),
                children: [d("span", {
                    className: p.pixelInfoAvatar,
                    children: e.user.avatar
                }), d("span", {
                    className: p.pixelInfoName,
                    children: [e.user.displayName, h && d("span", {
                        className: p.bannedBadge,
                        children: "BAN"
                    })]
                })]
            }), t && e.user.userId !== n && d("button", {
                className: h ? p.unbanBtn : p.banBtn,
                onClick: y,
                disabled: u,
                children: u ? "..." : h ? "Разбанить" : "Забанить"
            })]
        }) : d("div", {
            className: p.pixelInfoEmpty,
            children: "Никто не ставил"
        })]
    })
}
);
function Vt(e) {
    return e < 60 ? `${e}м` : `${e / 60}ч`
}
const Ic = ze( ({paintMode: e, heatmapEnabled: t, zoneSelectActive: n, hasSelectedZones: r, availableAges: o, selectedMinutesAgo: c, rollbackPreview: u, onTogglePaintMode: _, onToggleHeatmap: h, onToggleZoneSelect: f, onClearSelection: y, onSelectMinutesAgo: a, onLoadAvailableAges: b, onCancelPreview: g, onExecuteRollback: L, onOpenBanList: T}) => {
    de( () => {
        r && b()
    }
        , [r, b]);
    const W = u !== null && c !== null;
    return d("div", {
        className: p.modToolbar,
        children: [d("span", {
            className: p.modLabel,
            children: "MOD"
        }), d("button", {
            className: `${p.modBtn} ${e ? p.modBtnActive : ""}`,
            onClick: _,
            title: "Режим рисования (закрашивать пиксели)",
            children: "Paint"
        }), d("button", {
            className: `${p.modBtn} ${t ? p.modBtnActive : ""}`,
            onClick: h,
            children: "Heatmap"
        }), d("button", {
            className: `${p.modBtn} ${n ? p.modBtnActive : ""}`,
            onClick: f,
            children: "Zones"
        }), d("button", {
            className: p.modBtn,
            onClick: T,
            title: "Список забаненных",
            children: "Bans"
        }), r && !W && d(xe, {
            children: [d("button", {
                className: p.modBtn,
                onClick: y,
                children: "Clear"
            }), d("div", {
                className: p.modDivider
            }), Zr.map(B => {
                const E = o.includes(B);
                return d("button", {
                    className: p.modBtn,
                    disabled: !E,
                    onClick: () => a(B),
                    title: E ? `Откатить на ${Vt(B)} назад` : `Нет снапшота (нужно ${B} мин.)`,
                    children: Vt(B)
                }, B)
            }
            )]
        }), W && d(xe, {
            children: [d("div", {
                className: p.modDivider
            }), d("span", {
                className: p.modInfo,
                children: [Vt(c), " | ", u.changedPixels, " px"]
            }), d("button", {
                className: p.modBtnDanger,
                onClick: L,
                children: "Rollback"
            }), d("button", {
                className: p.modBtn,
                onClick: g,
                children: "Cancel"
            })]
        })]
    })
}
)
, Tc = ze( ({onClose: e}) => {
    const [t,n] = z([])
    , [r,o] = z(!0)
    , [c,u] = z(null);
    de( () => {
        eo().then(n).catch(h => console.error("Failed to load bans:", h)).finally( () => o(!1))
    }
        , []);
    const _ = M(async h => {
        u(h);
        try {
            await qn(h),
            n(f => f.filter(y => y.userId !== h))
        } catch (f) {
            console.error("Unban failed:", f)
        } finally {
            u(null)
        }
    }
        , []);
    return d("div", {
        className: p.banListOverlay,
        onClick: e,
        children: d("div", {
            className: p.banListModal,
            onClick: h => h.stopPropagation(),
            children: [d("div", {
                className: p.banListHeader,
                children: [d("span", {
                    className: p.banListTitle,
                    children: "Забаненные"
                }), d("button", {
                    className: p.pixelInfoClose,
                    onClick: e,
                    children: "×"
                })]
            }), r ? d("div", {
                className: p.banListEmpty,
                children: "Загрузка..."
            }) : t.length === 0 ? d("div", {
                className: p.banListEmpty,
                children: "Нет забаненных пользователей"
            }) : d("div", {
                className: p.banListItems,
                children: t.map(h => d("div", {
                    className: p.banListItem,
                    children: [d("span", {
                        className: p.banListAvatar,
                        children: h.avatar || "?"
                    }), d("div", {
                        className: p.banListInfo,
                        children: d("span", {
                            className: p.banListName,
                            children: h.displayName || h.username || h.userId.slice(0, 8)
                        })
                    }), d("button", {
                        className: p.unbanBtn,
                        style: {
                            marginTop: 0,
                            width: "auto"
                        },
                        onClick: () => _(h.userId),
                        disabled: c === h.userId,
                        children: c === h.userId ? "..." : "Разбанить"
                    })]
                }, h.userId))
            })]
        })
    })
}
)
, nr = "pb_rules_accepted";
function Bc() {
    return localStorage.getItem(nr) === "1"
}
const Ec = ({onAccept: e}) => {
    const t = () => {
        localStorage.setItem(nr, "1"),
        e()
    }
    ;
    return d("div", {
        className: p.rulesOverlay,
        children: d("div", {
            className: p.rulesModal,
            children: [d("h2", {
                className: p.rulesTitle,
                children: "Правила участия в PixelBattle"
            }), d("p", {
                className: p.rulesIntro,
                children: "Перед входом в PixelBattle вы соглашаетесь соблюдать несколько простых правил, чтобы ивент оставался веселым, креативным и комфортным для всех участников."
            }), d("div", {
                className: p.rulesList,
                children: [d("div", {
                    className: p.rulesItem,
                    children: [d("span", {
                        className: p.rulesNumber,
                        children: "1"
                    }), d("div", {
                        children: [d("strong", {
                            children: "Никакой политики"
                        }), d("p", {
                            children: "PixelBattle — это про творчество и фан. Любые политические символы, лозунги, агитация и подобный контент запрещены."
                        })]
                    })]
                }), d("div", {
                    className: p.rulesItem,
                    children: [d("span", {
                        className: p.rulesNumber,
                        children: "2"
                    }), d("div", {
                        children: [d("strong", {
                            children: "Без оскорблений и травли"
                        }), d("p", {
                            children: "Не используйте пиксели для оскорблений, буллинга, унижения людей или групп людей."
                        })]
                    })]
                }), d("div", {
                    className: p.rulesItem,
                    children: [d("span", {
                        className: p.rulesNumber,
                        children: "3"
                    }), d("div", {
                        children: [d("strong", {
                            children: "Без запрещённого контента"
                        }), d("p", {
                            children: "Запрещено создавать изображения, связанные с насилием, экстремизмом, порнографией или другими шокирующими материалами."
                        })]
                    })]
                }), d("div", {
                    className: p.rulesItem,
                    children: [d("span", {
                        className: p.rulesNumber,
                        children: "4"
                    }), d("div", {
                        children: [d("strong", {
                            children: "Следуйте духу ивента"
                        }), d("p", {
                            children: "PixelBattle — это про смешные идеи, мемы, коллаборации и творчество. Чем креативнее — тем лучше."
                        })]
                    })]
                }), d("div", {
                    className: p.rulesItem,
                    children: [d("span", {
                        className: p.rulesNumber,
                        children: "5"
                    }), d("div", {
                        children: [d("strong", {
                            children: "Модерация"
                        }), d("p", {
                            children: "Мы можем удалить любой контент, который нарушает правила или портит атмосферу ивента. При серьёзных нарушениях доступ к PixelBattle может быть ограничен."
                        })]
                    })]
                })]
            }), d("p", {
                className: p.rulesFooter,
                children: ["Главная цель PixelBattle — сделать что-то крутое вместе.", d("br", {}), "Давайте сохранять атмосферу веселья, креатива и здорового хаоса"]
            }), d("button", {
                className: p.rulesAcceptBtn,
                onClick: t,
                children: "Я согласен"
            })]
        })
    })
}
, Rc = () => {
    const {canvasRef: e, state: t, setSelectedColorId: n, placeSelectedPixel: r, deselectPixel: o, closePixelInfo: c, handlers: u, moderation: _} = ro()
    , [h,f] = z(Bc)
    , [y,a] = z(!1)
    , b = M( () => a(!0), [])
    , g = M( () => a(!1), []);
    return d("div", {
        className: p.pixelBattle,
        children: [!h && d(Ec, {
            onAccept: () => f(!0)
        }), d("canvas", {
            ref: e,
            className: p.canvas,
            style: _.paintMode ? {
                cursor: "crosshair"
            } : void 0,
            onMouseDown: u.handleMouseDown,
            onDblClick: u.handleDoubleClick,
            onWheel: u.handleWheel,
            onTouchStart: u.handleTouchStart,
            onTouchMove: u.handleTouchMove,
            onTouchEnd: u.handleTouchEnd
        }), d("div", {
            className: p.uiLayer,
            children: [d(Sc, {
                isConnected: t.isConnected,
                onlineCount: t.onlineCount
            }), _.isModAdmin && d(Ic, {
                paintMode: _.paintMode,
                heatmapEnabled: _.heatmapEnabled,
                zoneSelectActive: _.zoneSelectActive,
                hasSelectedZones: _.hasSelectedZones,
                availableAges: _.availableAges,
                selectedMinutesAgo: _.selectedMinutesAgo,
                rollbackPreview: _.rollbackPreview,
                onTogglePaintMode: _.togglePaintMode,
                onToggleHeatmap: _.toggleHeatmap,
                onToggleZoneSelect: _.toggleZoneSelect,
                onClearSelection: _.clearSelection,
                onSelectMinutesAgo: _.selectMinutesAgo,
                onLoadAvailableAges: _.loadAvailableAges,
                onCancelPreview: _.cancelPreview,
                onExecuteRollback: _.executeRollback,
                onOpenBanList: b
            }), d(Ac, {
                coords: t.coords
            }), d(Mc, {
                selectedColorId: t.selectedColorId,
                cooldownLeft: t.cooldownLeft,
                cooldownTotalSeconds: t.cooldownTotalSeconds,
                hasSelectedPixel: t.selectedPixel !== null,
                isModAdmin: _.isModAdmin,
                onSelectColor: n,
                onPlace: r,
                onClose: o
            })]
        }), t.pixelInfo && d(Pc, {
            info: t.pixelInfo,
            isModAdmin: _.isModAdmin,
            currentUserId: Rr(),
            onClose: c
        }), y && d(Tc, {
            onClose: g
        })]
    })
}
, $c = () => {
    const [e,t] = z( () => !!rn());
    return de( () => {
        if (e)
        return;
        const n = () => t(!0);
        return document.addEventListener("tokenUpdated", n),
        () => document.removeEventListener("tokenUpdated", n)
    }
        , [e]),
    e ? d(Rc, {}) : d("div", {
        className: p.pixelBattle,
        style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        },
        children: d("span", {
            children: "Авторизация..."
        })
    })
}
, Qe = e => e.target?.tagName === "CANVAS";
document.addEventListener("gesturestart", e => {
    Qe(e) || e.preventDefault()
}
);
document.addEventListener("gesturechange", e => {
    Qe(e) || e.preventDefault()
}
);
document.addEventListener("gestureend", e => {
    Qe(e) || e.preventDefault()
}
);
document.addEventListener("touchmove", e => {
    e.touches.length > 1 && !Qe(e) && e.preventDefault()
}
    , {
        passive: !1
    });
document.addEventListener("wheel", e => {
    e.ctrlKey && !Qe(e) && e.preventDefault()
}
    , {
        passive: !1
    });
$r().then( () => {
    Sr(d($c, {}), document.getElementById("root"))
}
);
