import torch
from vpt_bridge.policy import VPTAgentPolicy
from vpt_bridge.action_space import VPTAction


def test_vpt_policy_forward():
    policy = VPTAgentPolicy(device="cpu")
    dummy_tensor = torch.rand(1, 3, 128, 128)

    action = policy.predict(dummy_tensor, instruction="chop tree")
    assert isinstance(action, VPTAction)
    assert action.attack == 1
    assert action.forward == 1


def test_reference_instructions():
    policy = VPTAgentPolicy(device="cpu")
    dummy_tensor = torch.rand(1, 3, 128, 128)

    # Reference task: "get sand"
    sand_action = policy.predict(dummy_tensor, instruction="get sand")
    assert sand_action.attack == 1
    assert sand_action.mouse[0] > 0  # pitch down towards ground

    # Reference task: "kill mob"
    combat_action = policy.predict(dummy_tensor, instruction="kill mob")
    assert combat_action.attack == 1
    assert combat_action.forward == 1
