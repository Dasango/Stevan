from vpt_bridge.action_space import ActionSpace, VPTAction


def test_action_space_clamping():
    # Mouse deltas exceeding 30 degrees should be clamped
    clamped = ActionSpace.clamp_mouse(45.0, -100.0, max_delta=30.0)
    assert clamped == [30.0, -30.0]

    within_bounds = ActionSpace.clamp_mouse(-5.5, 12.0, max_delta=30.0)
    assert within_bounds == [-5.5, 12.0]


def test_vpt_action_serialization():
    action = VPTAction(
        mouse=[2.5, -3.0],
        attack=1,
        forward=1,
        jump=1,
    )
    d = action.to_dict()
    assert d["attack"] == 1
    assert d["forward"] == 1
    assert d["jump"] == 1
    assert d["sneak"] == 0
    assert d["mouse"] == [2.5, -3.0]

    reconstructed = ActionSpace.from_dict(d)
    assert reconstructed.attack == 1
    assert reconstructed.forward == 1
    assert reconstructed.mouse == [2.5, -3.0]
