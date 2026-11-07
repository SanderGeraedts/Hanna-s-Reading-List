import type { MotifId } from '#/lib/nookMotifs'

/**
 * The little figures that stand (or fly) in a series' book nook (#56),
 * painted like a cut-out in a paper diorama. Each is drawn on a square
 * canvas, standing on its bottom edge.
 */

type Ctx = CanvasRenderingContext2D

export interface MotifArt {
  /** flies in the sky instead of standing on the ground */
  flies?: boolean
  /** shines by itself (a Patronus, a magic ring) */
  shines?: boolean
  /** height in the nook, metres; at most 0.08 so it fits between the walls */
  size: number
  draw: (ctx: Ctx) => void
}

const S = 512

function path(ctx: Ctx, fill: string | CanvasGradient, points: Array<[number, number]>, stroke?: string) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 6
    ctx.stroke()
  }
}

function ellipse(ctx: Ctx, fill: string | CanvasGradient, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

/** A soft halo behind a figure so it stands out from the scene. */
function halo(ctx: Ctx, x: number, y: number, r: number, colour: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, colour)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
}

export const MOTIFS: Record<MotifId, MotifArt> = {
  dragon: {
    flies: true,
    size: 0.08,
    draw(ctx) {
      // fire first, behind the head
      const fire = ctx.createLinearGradient(400, 150, 512, 190)
      fire.addColorStop(0, '#fff3a0')
      fire.addColorStop(0.5, '#ffae3d')
      fire.addColorStop(1, 'rgba(255,90,30,0)')
      path(ctx, fire, [[410, 168], [505, 130], [480, 176], [510, 214], [410, 184]])
      // far wing
      path(ctx, '#6e2418', [[250, 220], [300, 40], [340, 90], [380, 60], [360, 150], [330, 230]])
      // tail
      ctx.beginPath()
      ctx.moveTo(190, 260)
      ctx.bezierCurveTo(120, 300, 60, 250, 20, 300)
      ctx.bezierCurveTo(70, 270, 120, 330, 200, 290)
      ctx.fillStyle = '#8a2f22'
      ctx.fill()
      path(ctx, '#8a2f22', [[20, 300], [0, 280], [8, 320]])
      // body and neck
      ellipse(ctx, '#8a2f22', 260, 260, 90, 42, -0.15)
      ctx.beginPath()
      ctx.moveTo(320, 250)
      ctx.quadraticCurveTo(370, 230, 380, 180)
      ctx.lineTo(410, 186)
      ctx.quadraticCurveTo(400, 260, 340, 285)
      ctx.fill()
      // head, horns, eye
      path(ctx, '#8a2f22', [[370, 160], [420, 160], [440, 178], [410, 196], [372, 196]])
      path(ctx, '#3a120c', [[378, 162], [360, 130], [392, 158]])
      ellipse(ctx, '#ffd24a', 404, 172, 5, 4)
      // legs
      path(ctx, '#6e2418', [[230, 290], [215, 340], [240, 340], [250, 295]])
      path(ctx, '#6e2418', [[300, 285], [310, 335], [330, 330], [318, 280]])
      // near wing, with ribs
      path(ctx, '#b5452f', [[230, 240], [150, 30], [200, 70], [240, 20], [270, 90], [320, 60], [300, 230]])
      ctx.strokeStyle = '#6e2418'
      ctx.lineWidth = 5
      for (const [x, y] of [[150, 30], [240, 20], [320, 60]]) {
        ctx.beginPath()
        ctx.moveTo(265, 235)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    },
  },

  stag: {
    shines: true,
    size: 0.08,
    draw(ctx) {
      halo(ctx, 256, 280, 250, 'rgba(190,225,255,0.55)')
      ctx.shadowColor = '#bfe4ff'
      ctx.shadowBlur = 30
      const silver = '#e8f4ff'
      // legs
      for (const [x, lean] of [[190, -8], [215, 6], [320, -6], [345, 8]]) {
        path(ctx, silver, [[x, 300], [x + 18, 300], [x + 14 + lean, 505], [x + 4 + lean, 505]])
      }
      // body, neck, head
      ellipse(ctx, silver, 268, 290, 100, 48)
      path(ctx, silver, [[330, 270], [370, 160], [400, 170], [372, 290]])
      ellipse(ctx, silver, 392, 160, 36, 22, 0.5)
      path(ctx, silver, [[160, 270], [140, 250], [165, 285]])
      // antlers
      ctx.strokeStyle = silver
      ctx.lineCap = 'round'
      ctx.lineWidth = 9
      const antler = (dir: number) => {
        ctx.beginPath()
        ctx.moveTo(380, 140)
        ctx.quadraticCurveTo(380 + dir * 30, 80, 360 + dir * 60, 20)
        ctx.moveTo(382 + dir * 14, 100)
        ctx.lineTo(382 + dir * 50, 80)
        ctx.moveTo(372 + dir * 34, 60)
        ctx.lineTo(370 + dir * 70, 50)
        ctx.moveTo(370 + dir * 22, 120)
        ctx.lineTo(352 + dir * 4, 92)
        ctx.stroke()
      }
      antler(-1)
      antler(1)
      ctx.shadowBlur = 0
    },
  },

  trident: {
    size: 0.08,
    draw(ctx) {
      halo(ctx, 256, 180, 200, 'rgba(120,200,255,0.35)')
      const gold = ctx.createLinearGradient(200, 0, 310, 0)
      gold.addColorStop(0, '#a87a22')
      gold.addColorStop(0.5, '#ffe08a')
      gold.addColorStop(1, '#a87a22')
      ctx.fillStyle = gold
      ctx.fillRect(246, 120, 20, 360)
      // the three prongs
      ctx.fillRect(176, 120, 160, 18)
      for (const x of [176, 246, 318]) path(ctx, gold, [[x, 125], [x + 9, 20], [x + 18, 125]])
      path(ctx, gold, [[176, 138], [160, 90], [186, 120]])
      path(ctx, gold, [[336, 138], [352, 90], [326, 120]])
      // waves round the foot
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        const y = 450 + i * 20
        ctx.moveTo(60, y)
        for (let x = 60; x <= 452; x += 56) ctx.quadraticCurveTo(x + 28, y - 26, x + 56, y)
        ctx.lineTo(452, 512)
        ctx.lineTo(60, 512)
        ctx.fillStyle = ['#3d8fc4', '#2f73a8', '#235a87'][i]
        ctx.fill()
      }
    },
  },

  pyramid: {
    size: 0.075,
    draw(ctx) {
      halo(ctx, 256, 120, 160, 'rgba(255,220,120,0.6)')
      path(ctx, '#e3c27a', [[256, 120], [40, 500], [256, 500]])
      path(ctx, '#b8924c', [[256, 120], [472, 500], [256, 500]])
      ctx.strokeStyle = 'rgba(90,60,20,0.35)'
      ctx.lineWidth = 3
      for (let y = 170; y < 500; y += 40) {
        const half = ((y - 120) / 380) * 216
        ctx.beginPath()
        ctx.moveTo(256 - half, y)
        ctx.lineTo(256 + half, y)
        ctx.stroke()
      }
      // the glowing capstone
      path(ctx, '#ffe48a', [[256, 120], [222, 180], [290, 180]])
      // an ankh beside it
      ctx.strokeStyle = '#ffd24a'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.ellipse(470, 380, 18, 24, 0, 0, Math.PI * 2)
      ctx.moveTo(470, 404)
      ctx.lineTo(470, 500)
      ctx.moveTo(440, 425)
      ctx.lineTo(500, 425)
      ctx.stroke()
    },
  },

  crown: {
    size: 0.06,
    draw(ctx) {
      halo(ctx, 256, 300, 230, 'rgba(255,215,120,0.45)')
      // cushion
      ellipse(ctx, '#7a1f3a', 256, 455, 190, 50)
      ellipse(ctx, '#9a2f4f', 256, 440, 175, 38)
      const gold = ctx.createLinearGradient(0, 200, 0, 420)
      gold.addColorStop(0, '#ffe9a0')
      gold.addColorStop(1, '#c08a28')
      path(ctx, gold, [[110, 420], [90, 220], [175, 320], [256, 180], [337, 320], [422, 220], [402, 420]])
      ctx.fillStyle = '#a8761f'
      ctx.fillRect(110, 390, 292, 30)
      for (const [x, y] of [[90, 220], [256, 180], [422, 220]]) ellipse(ctx, '#fff2c0', x, y, 16, 16)
      for (const [x, c] of [[170, '#3fa0d8'], [256, '#d83f5a'], [342, '#3fd88a']] as const) ellipse(ctx, c, x, 405, 14, 11)
    },
  },

  rose: {
    size: 0.07,
    draw(ctx) {
      halo(ctx, 256, 160, 180, 'rgba(255,140,160,0.4)')
      ctx.strokeStyle = '#2f6b33'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(256, 230)
      ctx.quadraticCurveTo(236, 380, 256, 505)
      ctx.stroke()
      ellipse(ctx, '#3f8a43', 200, 340, 48, 20, -0.6)
      ellipse(ctx, '#3f8a43', 310, 400, 48, 20, 0.6)
      path(ctx, '#2f6b33', [[246, 300], [228, 286], [250, 290]])
      // petals, outside in
      ellipse(ctx, '#9a1428', 256, 170, 92, 76)
      ellipse(ctx, '#c41e3a', 226, 160, 52, 60, -0.4)
      ellipse(ctx, '#c41e3a', 288, 160, 52, 60, 0.4)
      ellipse(ctx, '#e0304f', 256, 140, 46, 46)
      ctx.strokeStyle = '#7a0f20'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(256, 138, 22, 0.3, Math.PI * 1.7)
      ctx.stroke()
    },
  },

  sword: {
    size: 0.08,
    draw(ctx) {
      halo(ctx, 256, 200, 200, 'rgba(180,220,255,0.4)')
      // the stone it is stuck in
      path(ctx, '#7d7a73', [[140, 512], [160, 430], [220, 400], [310, 405], [360, 440], [372, 512]])
      path(ctx, '#9a968d', [[170, 440], [222, 410], [300, 414], [250, 450]])
      const steel = ctx.createLinearGradient(236, 0, 276, 0)
      steel.addColorStop(0, '#9aa8b8')
      steel.addColorStop(0.5, '#f4f8ff')
      steel.addColorStop(1, '#8a98a8')
      path(ctx, steel, [[238, 140], [274, 140], [270, 420], [242, 420]])
      path(ctx, '#c9a24a', [[170, 120], [342, 120], [342, 142], [170, 142]])
      ctx.fillStyle = '#5a3a22'
      ctx.fillRect(244, 40, 24, 80)
      ellipse(ctx, '#c9a24a', 256, 34, 20, 20)
    },
  },

  ring: {
    flies: true,
    shines: true,
    size: 0.05,
    draw(ctx) {
      halo(ctx, 256, 256, 240, 'rgba(255,200,90,0.55)')
      ctx.shadowColor = '#ffcf5a'
      ctx.shadowBlur = 40
      ctx.lineWidth = 46
      const gold = ctx.createLinearGradient(100, 100, 400, 400)
      gold.addColorStop(0, '#fff0a8')
      gold.addColorStop(0.5, '#e0a832')
      gold.addColorStop(1, '#fff0a8')
      ctx.strokeStyle = gold
      ctx.beginPath()
      ctx.ellipse(256, 270, 150, 120, -0.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    },
  },

  wolf: {
    size: 0.075,
    draw(ctx) {
      halo(ctx, 330, 90, 110, 'rgba(240,240,220,0.9)')
      const grey = '#5d6470'
      // sitting, head up, howling
      path(ctx, grey, [[170, 505], [150, 380], [200, 260], [260, 200], [300, 120], [330, 70], [345, 110], [360, 100], [350, 150], [320, 210], [300, 280], [320, 400], [330, 505]])
      path(ctx, grey, [[330, 70], [395, 40], [400, 56], [348, 100]])
      path(ctx, '#474d57', [[300, 120], [290, 80], [318, 100]])
      // tail
      ctx.beginPath()
      ctx.moveTo(175, 480)
      ctx.quadraticCurveTo(80, 470, 70, 400)
      ctx.quadraticCurveTo(110, 440, 180, 440)
      ctx.fillStyle = '#474d57'
      ctx.fill()
      path(ctx, '#474d57', [[260, 505], [270, 420], [300, 420], [300, 505]])
    },
  },

  crow: {
    flies: true,
    size: 0.065,
    draw(ctx) {
      halo(ctx, 256, 256, 230, 'rgba(160,180,220,0.35)')
      const black = '#1a1c24'
      path(ctx, black, [[256, 250], [60, 140], [120, 150], [70, 110], [150, 130], [120, 90], [230, 200]])
      path(ctx, black, [[260, 250], [452, 140], [392, 150], [442, 110], [362, 130], [392, 90], [282, 200]])
      ellipse(ctx, black, 256, 260, 40, 70)
      ellipse(ctx, black, 256, 190, 30, 30)
      path(ctx, '#3a3d48', [[244, 180], [256, 130], [268, 180]])
      path(ctx, black, [[230, 320], [256, 380], [282, 320]])
      ellipse(ctx, '#d9dde8', 244, 186, 4, 4)
    },
  },

  cat: {
    size: 0.06,
    draw(ctx) {
      halo(ctx, 256, 300, 200, 'rgba(255,220,160,0.35)')
      const fur = '#2b2622'
      ellipse(ctx, fur, 256, 420, 100, 90)
      ellipse(ctx, fur, 256, 260, 72, 64)
      path(ctx, fur, [[192, 240], [200, 160], [240, 214]])
      path(ctx, fur, [[320, 240], [312, 160], [272, 214]])
      ctx.strokeStyle = fur
      ctx.lineWidth = 26
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(340, 490)
      ctx.quadraticCurveTo(450, 480, 420, 380)
      ctx.stroke()
      ellipse(ctx, '#c9e05a', 230, 255, 11, 13)
      ellipse(ctx, '#c9e05a', 282, 255, 11, 13)
      ellipse(ctx, '#111', 230, 255, 3, 10)
      ellipse(ctx, '#111', 282, 255, 3, 10)
    },
  },

  ship: {
    size: 0.075,
    draw(ctx) {
      halo(ctx, 256, 220, 220, 'rgba(255,230,180,0.3)')
      path(ctx, '#f2ead6', [[250, 60], [250, 330], [120, 330]])
      path(ctx, '#e6dcc2', [[266, 90], [266, 330], [380, 330]])
      ctx.fillStyle = '#4a2f1d'
      ctx.fillRect(250, 50, 14, 300)
      path(ctx, '#c4303a', [[264, 50], [320, 64], [264, 78]])
      path(ctx, '#6b4226', [[80, 350], [440, 350], [400, 430], [120, 430]])
      ctx.fillStyle = '#4a2f1d'
      ctx.fillRect(100, 370, 320, 10)
      for (let i = 0; i < 2; i++) {
        ctx.beginPath()
        const y = 440 + i * 30
        ctx.moveTo(0, y)
        for (let x = 0; x <= 512; x += 64) ctx.quadraticCurveTo(x + 32, y - 24, x + 64, y)
        ctx.lineTo(512, 512)
        ctx.lineTo(0, 512)
        ctx.fillStyle = ['#2f73a8', '#235a87'][i]
        ctx.fill()
      }
    },
  },

  quill: {
    size: 0.07,
    draw(ctx) {
      halo(ctx, 256, 260, 220, 'rgba(255,230,170,0.4)')
      // the feather
      ctx.beginPath()
      ctx.moveTo(250, 420)
      ctx.quadraticCurveTo(240, 200, 380, 30)
      ctx.quadraticCurveTo(360, 220, 262, 420)
      ctx.fillStyle = '#f5f0e6'
      ctx.fill()
      ctx.strokeStyle = '#b8ad96'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(256, 420)
      ctx.quadraticCurveTo(290, 220, 380, 30)
      ctx.stroke()
      // ink pot
      ellipse(ctx, '#1c2a4a', 256, 450, 100, 60)
      ctx.fillStyle = '#2a3c66'
      ctx.fillRect(206, 370, 100, 50)
      ellipse(ctx, '#0e1528', 256, 372, 50, 12)
      ellipse(ctx, 'rgba(255,255,255,0.25)', 220, 440, 18, 30, 0.3)
    },
  },

  apple: {
    size: 0.045,
    draw(ctx) {
      halo(ctx, 256, 300, 220, 'rgba(255,120,120,0.35)')
      ellipse(ctx, '#b3142a', 210, 320, 120, 140)
      ellipse(ctx, '#b3142a', 302, 320, 120, 140)
      ellipse(ctx, 'rgba(255,255,255,0.28)', 180, 270, 26, 50, 0.4)
      ctx.fillStyle = '#4a2f1d'
      ctx.fillRect(250, 140, 12, 60)
      ellipse(ctx, '#3f8a43', 300, 150, 44, 18, -0.5)
    },
  },

  lion: {
    size: 0.07,
    draw(ctx) {
      halo(ctx, 256, 260, 230, 'rgba(255,210,120,0.4)')
      // sitting body
      ellipse(ctx, '#c98f3a', 256, 410, 110, 95)
      path(ctx, '#c98f3a', [[190, 505], [200, 400], [230, 505]])
      path(ctx, '#c98f3a', [[282, 505], [312, 400], [322, 505]])
      // mane, then face
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        ellipse(ctx, '#8a4f1d', 256 + Math.cos(a) * 80, 230 + Math.sin(a) * 80, 46, 30, a)
      }
      ellipse(ctx, '#e0a850', 256, 232, 70, 72)
      ellipse(ctx, '#2b1a10', 230, 220, 7, 8)
      ellipse(ctx, '#2b1a10', 282, 220, 7, 8)
      path(ctx, '#5a3018', [[244, 252], [268, 252], [256, 266]])
    },
  },
}

/** A motif painted on a canvas (transparent around it). */
export function paintMotif(id: MotifId): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  MOTIFS[id].draw(c.getContext('2d')!)
  return c
}
